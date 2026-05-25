# MADCreate Verification Report

Date: 2026-05-25  
Workspace: `C:\Code\madprospects\madcreate`

## Executive Summary

Validation could not be completed end-to-end because the local workspace dependency environment is unstable. The parent `C:\Code` pnpm workspace repeatedly removed MADCreate workspace contents while attempting package-manager repair/install operations. To avoid leaving the application blank, the project was restored from the only intact local archive found at `C:\Code\madprospects\_archive\madcreate-20260523165336`.

The application context in the request says `.NET Core API + MSSQL`, but the project instructions and recovered source are `NestJS API + Angular SPA + Prisma MySQL`. Validation was therefore performed against the actual recovered stack.

## Completed Validations

- Confirmed project shape: NestJS API, Angular SPA, Prisma schema using MySQL.
- Read `C:\Code\MAD\Setup.xlsx`; it contains a single sheet named `Projects` with only the visible header/value `Product`.
- Confirmed local Docker is unavailable: `docker` command is not installed.
- Confirmed Redis is reachable on `localhost:6379`.
- Confirmed MySQL is not reachable on `localhost:3306`.
- Confirmed no `.env` file exists in the workspace.
- Confirmed Prisma schema validates when `DATABASE_URL=mysql://madcreate:madcreate@localhost:3306/madcreate` is supplied, with Prisma relation-mode index warnings.
- Confirmed production environment file already points the frontend API at `https://madcreateapi.madprospects.com/v1`.
- Confirmed favicons and PWA icons exist under `apps/web/public`.

## Fixes Applied

- Restored the emptied workspace from `C:\Code\madprospects\_archive\madcreate-20260523165336`.
- Recreated `AGENTS.md` from the project instructions supplied in this conversation.

## Issues Found

### Stack Mismatch

The user brief requested `.NET Core API` and local MSSQL, but this project is Node/NestJS and Prisma MySQL. There is no `.NET` solution, no MSSQL migration project, and no Hangfire database.

### Dependency Environment Failure

Initial builds failed because dependencies had drifted:

- Angular packages had resolved to Angular `22.0.0-rc.1` while TypeScript was `5.6.3`.
- Angular build error: Angular compiler requires TypeScript `>=6.0.0 <6.1.0`, but `5.6.3` was installed.
- API build failed because Prisma Client did not match the checked-in Prisma schema.
- Web test command failed with `Unknown arguments: watch, browsers` before a valid Angular test target was available.

Package-manager repair against the parent `C:\Code` pnpm workspace then caused the local project folders to become empty twice. The workspace was restored from archive after each occurrence, and package-manager operations were stopped.

### Database

- Docker is unavailable, so the repo's MySQL/Redis compose topology cannot be started locally.
- Local MySQL on `localhost:3306` is not reachable.
- Migrations/db push/seed could not be executed locally.
- SQL Server LocalDB is installed and running as `(localdb)\MSSQLLocalDB`.
- LocalDB contains existing MAD databases: `MAD`, `MADai`, `MADai_Hangfire`, `MadAuthorLocal`, `MadAuthorLocalHangfire`, `MadAuthorVerification`, `MadAuthorVerificationHangfire`, `MADCloud`, `madhub_dev`, `madleads`, and `madleadshangfire`.
- No application connection string was found in `C:\MAD` or `C:\Code\MAD`; `C:\MAD` exists but is empty, while `C:\Code\MAD` appears to be shared brand/assets/docs material.

### Branding / Domain Sweep

Repo-wide search found many remaining `madleads.ai` references in config, docs, Apache/nginx vhosts, seed data, render/domain fallbacks, operator scripts, and frontend footer text. Some may be intentionally retained for legacy DNS and DB host values per `AGENTS.md`; they need product-owner confirmation before a blanket replacement.

## Evidence

- `Setup.xlsx`: sheet `Projects`; visible content: `Product`.
- `docker`: command not found.
- `localhost:3306`: TCP test failed.
- `localhost:6379`: TCP test succeeded.
- `sqllocaldb info`: found `MSSQLLocalDB`, state `Running`, pipe `np:\\.\pipe\LOCALDB#630A6991\tsql\query`.
- `sqlcmd -S "(localdb)\MSSQLLocalDB" -E`: connected successfully and listed existing MAD databases.
- Prisma validation: passed with relation-mode index warnings after supplying a local MySQL `DATABASE_URL`.
- Package-manager blocker: pnpm reported `ENOSPC`, then missing package links; after repair attempts the workspace directory became empty and required archive restore.

## Screenshots

No browser screenshots were captured because the frontend and backend could not be run safely after the dependency environment failure.

## Logs

Key command failures captured during validation:

- `npm run build`: timed out during combined build.
- `npm --workspace @madcreate/web run build`: failed on Angular 22/TypeScript 5.6 mismatch.
- `npm run test`: failed because Angular CLI rejected `--watch=false --browsers=ChromeHeadless`.
- `npx prisma validate`: initially failed due missing `DATABASE_URL`.
- `prisma validate` with `DATABASE_URL`: passed with relation-mode warnings.
- `docker --version`: command not found.

## MAD Cloud Task Evidence

MAD Cloud task submission and worker execution were not validated because the API could not be safely built/run and the local MySQL database was unavailable.

## Remaining Risks

- Local workspace needs restoration from source control, not just the older archive, because uncommitted user changes that existed before this run are not present in the archive.
- Parent `C:\Code` pnpm workspace appears unsafe for this repo until its `node_modules`/workspace configuration is repaired.
- Database validation requires either Docker Desktop/CLI or a reachable local MySQL service.
- Browser validation requires successful dependency install/build/start after the workspace is restored from current source.
- Branding/domain replacement needs a decision on whether `madleads.ai` is legacy branding or still canonical for DB/DNS compatibility.
