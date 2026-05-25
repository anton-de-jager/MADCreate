# Project Agent Notes

## Migration Update 2026-05-25
- Ecosystem migration from madproducts to madprospects executed for this project tree.
- Branding/path replacements were applied recursively.
- Angular dependencies were moved to Angular 22 RC channel (next) where applicable.
- pnpm store target is C:/Code/.pnpm.
- See C:/Code/madprospects/MIGRATION_REPORT.md for full validation status and blockers.


## Migration Update (2026-05-25)
- Workspace migration finalized under `C:\\Code\\madprospects`; legacy source directories in `C:\\Code` were removed after true move.
- pnpm shared store remains centralized at `C:/Code/.pnpm`; `pnpm approve-builds --all` was run in active workspace contexts.
- `@madcreate/shared` linkage was finalized for app-level operations (`workspace:*` resolving to `link:../../packages/shared` in installs).
- Added `C:\\Code\\madprospects\\madcreate\\.npmrc` with `recursive-install=false` and kept pnpm-first scripts for shared-package prebuild hooks.

