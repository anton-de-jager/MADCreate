---
description: Stand up MADCreate locally â€” Docker MSSQL + Redis, monorepo install, Entity Framework Core schema + seed. Idempotent.
argument-hint: [--reset] [--start] [--no-docker] [--yes]
---

# /setup â€” local-dev bootstrap for MADCreate

Drive `C:\Code\madcreate\setup.ps1` to bring the four layers up from scratch (or refresh them):

1. **Env** â€” copies `.env.example` â†’ `.env` on first run, auto-fills `JWT_SECRET` and `JWT_REFRESH_SECRET` with 64-char random strings if they still hold the placeholder text.
2. **Infra** â€” `docker compose up -d mssql redis` (waits for the MSSQL healthcheck). With `--no-docker`, trusts an already-running local MSSQL + Redis pointed at by `.env`.
3. **Code** â€” `npm install` at the monorepo root. Workspaces pull in `apps/api`, `apps/web`, and `packages/shared`.
4. **Schema** â€” `Entity Framework Core:generate` â†’ `Entity Framework Core:push --accept-data-loss` â†’ `Entity Framework Core:seed`. Uses `db push` (not `migrate dev`) so dev setup never produces stray migration files; switch to `migrate dev` manually once you start versioning the schema.

The script is safe to re-run; existing `.env` values are preserved unless explicitly overridden, and the seed upserts so it never duplicates rows.

## Arguments

Parse `$ARGUMENTS` and translate each flag to its `setup.ps1` switch:

| User flag | Maps to PowerShell |
|---|---|
| `--reset` | `-Reset` (destructive â€” `docker compose down -v`, or DROP+CREATE the database with `--no-docker`) |
| `--start` | `-StartServers` (launch `npm run dev` in a new window after setup) |
| `--no-docker` | `-NoDocker` (assume MSSQL + Redis already run locally) |
| `--skip-infra` | `-SkipInfra` |
| `--skip-install` | `-SkipInstall` |
| `--skip-Entity Framework Core` | `-SkipEntity Framework Core` |
| `--skip-seed` | `-SkipSeed` |
| `--yes` | `-Yes` (no destructive-action prompts) |
| `--jwt-secret <s>` | `-JwtSecret <s>` |
| `--jwt-refresh-secret <s>` | `-JwtRefreshSecret <s>` |

If `$ARGUMENTS` is empty, run the script with no flags â€” that's the safe, first-time-setup default.

## Steps

1. **Safety gate.** If `--reset` is present and `--yes` is NOT, confirm with the user before running. With docker, this destroys the `mssql-data` and `redis-data` volumes. With `--no-docker`, it drops the `madcreate` database via the root MSSQL user.

2. **Verify the script exists** at `C:\Code\madcreate\setup.ps1`. If it doesn't, stop and report â€” the script is part of the repo and shouldn't be missing.

3. **Invoke** via the PowerShell tool:
   ```
   C:\Code\madcreate\setup.ps1 <mapped flags>
   ```
   Stream the output back to the user â€” it's already color-coded with `==> <phase>` headers.

4. **On failure**, surface the exact phase header that failed and the error line. Common failure modes:
   - **`docker not on PATH`** â†’ install Docker Desktop, or pass `--no-docker` if MSSQL + Redis are running locally.
   - **`Node X detected; package.json requires >= 20.11`** â†’ upgrade Node. The monorepo's `engines` field is enforced by the script.
   - **`Entity Framework Core db push failed`** â†’ almost always a `DATABASE_URL` problem. Check `.env` â€” the URL must be `sqlserver://USER:PASS@HOST:PORT/DB` and special chars in the password must be URL-encoded (`@` â†’ `%40`).
   - **MSSQL "did not report healthy within 60s"** â†’ the container is up but slow to come up on the first run. Re-run `/setup` and the healthcheck usually passes on the second attempt; or run `docker compose logs mssql` to investigate.

5. **On success**, the script prints the super-admin credentials (seeded as `admin@madcreate.local` / `ChangeMeNow!23`) and the `npm run dev` command. Echo that block back to the user â€” and remind them to change the super-admin password on first login.

## Notes

- **Local development only.** Platform deployment is `npm run deploy:web` / `npm run deploy:api`.
- The Docker stack also defines `api`, `web`, and `nginx` services. The script only starts `mssql` and `redis` because the api + web are normally run via `npm run dev` for hot-reload during development. To run the *full* containerised stack instead, use `docker compose up -d` directly.
- Re-running `/setup` after a pull is the canonical way to pick up new dependencies, schema changes, or seed data.
