# MADCreate — Application Standards

> Canonical reference for the visual and behavioural standards of the
> MADCreate platform. The Angular frontend is a standalone-component
> Angular 19 app styled with **Tailwind + custom `mc-*` primitives** —
> no Fuse, no Angular Material. The API is **NestJS 11 + Prisma 5 +
> MySQL + Redis** (BullMQ). When this file and inline code comments
> disagree, the code wins; please update this file in the same commit.
>
> Last reviewed: 2026-05-20.

---

## Stack

| Layer    | Tech                                                                                                  |
|----------|-------------------------------------------------------------------------------------------------------|
| Frontend | Angular 19, standalone components, signals, OnPush                                                    |
| Styling  | Tailwind 3 (`darkMode: 'class'`) + custom `mc-*` classes in `apps/web/src/styles.scss` `@layer components` |
| Forms    | Reactive forms via `FormBuilder` — never template-driven for non-trivial forms                        |
| API      | NestJS 11, modular per feature (`apps/api/src/modules/*`)                                             |
| ORM      | Prisma 5 (`prisma/schema.prisma`). MySQL on `mysql.madcreate.madleads.ai`.                            |
| Queue    | BullMQ on Redis 7 (`@nestjs/bullmq`, `ioredis`). Used for AI generation jobs.                         |
| Auth     | JWT bearer via interceptor + `X-Worker-Token` constant-time bypass for the autonomous worker          |
| Deploy   | `pwsh deploy.ps1` — Posh-SSH SFTP + remote `prisma db push` + PM2 reload of `mc-api` on DreamHost CloudCompute |

---

## Colors

Live in `apps/web/src/styles.scss` as CSS variables. `ThemeService` swaps
them at runtime per tenant — never hard-code a hex in a component.

| Token              | Default (dark)         | Light variant       | Tailwind class            |
|--------------------|------------------------|---------------------|---------------------------|
| `--brand`          | `231 76 60` (#E74C3C) | same                | `bg-brand` / `text-brand` |
| `--brand-fg`       | `255 255 255`          | same                | `text-brand-fg`           |
| `--accent`         | `39 174 96` (#27ae60)| same                | `bg-accent`               |
| `--surface`        | `11 11 18`  (#0B0B12)  | `255 255 255`       | `bg-surface`              |
| `--surface-raised` | `19 19 28`  (#13131C)  | `248 250 252`       | `bg-surface-raised`       |
| `--surface-subtle` | `28 28 41`  (#1C1C29)  | `241 245 249`       | `bg-surface-subtle`       |
| `--fg`             | `250 250 250`          | `17 24 39`          | `text-fg`                 |
| `--fg-muted`       | `156 163 175`          | `71 85 105`         | `text-fg-muted`           |
| `--fg-subtle`      | `107 114 128`          | `148 163 184`       | `text-fg-subtle`          |
| `--success`        | `34 197 94`            | `22 163 74`         | `text-success`            |
| `--warning`        | `234 179 8`            | `202 138 4`         | `text-warning`            |
| `--danger`         | `239 68 68`            | `220 38 38`         | `text-danger`             |

Use `border-white/5` / `border-white/10` for hairlines on dark surfaces.
Never `border-gray-*` literals.

## Theme

| Setting            | Current Value                                                                                  |
|--------------------|------------------------------------------------------------------------------------------------|
| Engine             | Plain Tailwind + CSS variables. No theming framework.                                          |
| Dark mode          | `darkMode: 'class'` — `.dark` selector on `<html>`. Default = dark.                            |
| Tenant-side themes | `ThemeService.applyTheme()` swaps `--brand`, `--accent`, `--surface*`, `--fg*` based on the active tenant's `brandKit`. |
| Critical surfaces  | `bg-surface` (page), `bg-surface-raised` (cards), `bg-surface-subtle` (inputs).                |
| Backgrounds        | `bg-gradient-brand`, `bg-aurora`, `bg-grid` are pre-built in `tailwind.config.js`.             |

## Typography

| Token         | Family                              | Notes                                       |
|---------------|-------------------------------------|---------------------------------------------|
| `font-sans`   | `Inter, ui-sans-serif, system-ui`   | Body, default.                              |
| `font-display`| `"Cal Sans", Inter, ui-sans-serif`  | Used via `.mc-heading` for marketing copy.  |
| `font-mono`   | `"JetBrains Mono", ui-monospace`    | `<code>`, `#id` chips, attachments.         |
| Eyebrow       | `.mc-eyebrow`                       | `text-xs font-semibold tracking-[0.18em] uppercase text-brand` |
| Heading       | `.mc-heading`                       | `font-display tracking-tight`               |

## Breakpoints

Tailwind defaults — **not** overridden in `tailwind.config.js`. Use
`sm:` (640), `md:` (768), `lg:` (1024), `xl:` (1280), `2xl:` (1536).

## Layout

| Property        | Value                                                                                              |
|-----------------|----------------------------------------------------------------------------------------------------|
| Main shell      | `DashboardLayoutComponent` at `apps/web/src/app/layouts/dashboard/` — provides sidebar + topbar slot |
| Auth shell      | Standalone routes mount pages at top level — no auth-only layout component                         |
| Content padding | `px-4 md:px-6 lg:px-8 py-6 md:py-8` — set inside each feature page                                 |
| Max width       | No global cap; feature pages opt in with `max-w-6xl mx-auto`                                       |

## Card Standard

Use the `mc-card` / `mc-card-hover` Tailwind components defined in
`styles.scss` — **never** ad-hoc `bg-gray-*` / `border-gray-*`.

| Variant          | Class            | Usage                                          |
|------------------|------------------|------------------------------------------------|
| Resting card     | `mc-card`        | Most surfaces — list rows, summary tiles       |
| Interactive card | `mc-card-hover`  | Clickable rows (lifts on hover)                |
| Glass panel      | `mc-glass`       | Floating overlays, hero cards on marketing     |

Padding: `p-4` (compact), `p-5` / `p-6` (standard list row / detail
card), `p-8` (large editor panel).

## Button Standard

**All buttons are icon-only with a tooltip.** Text labels are reserved
for the marketing site and the onboarding wizard (first-time users
need affordance). Inside the operator app (`/app/*`), every clickable
control is an icon + `title` attribute, no exceptions.

| Class             | Tooltip                | Usage                                       |
|-------------------|------------------------|---------------------------------------------|
| `mc-btn-primary`  | `title="<action>"`     | Primary action (Save, Confirm, Submit)      |
| `mc-btn-secondary`| `title="<action>"`     | Secondary actions (Edit, Duplicate, Export) |
| `mc-btn-ghost`    | `title="<action>"`     | Tertiary, close, refresh, dismiss           |

```html
<!-- Operator UI: icon only -->
<button class="mc-btn-primary !px-3 !py-2" (click)="save()" title="Save"><i class="fa-solid fa-check"></i></button>
<button class="mc-btn-ghost   !px-3 !py-2" (click)="cancel()" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
<button class="mc-btn-ghost   !px-2 !py-2" (click)="refresh()" title="Refresh"><i class="fa-solid fa-arrows-rotate"></i></button>
```

Rules:
- **Every button must have a visible background.** No transparent / background-less buttons. `mc-btn-ghost` uses `bg-white/5` as its resting background. Never create a `<button>` without one of the `mc-btn-*` classes (which all include a background).
- **Tooltip is mandatory.** No icon-only button ships without a `title`.
- **Disabled buttons still need a tooltip** explaining *why* they're disabled
  (e.g. `title="Save — fix validation errors first"`).
- **Min touch target 44×44 px** (WCAG 2.5.5). Use
  `!min-w-[44px] !min-h-[44px]` if the default padding would shrink the
  target below that.
- **Never rely on colour alone** to convey state (WCAG 1.4.1). Pair red
  with `fa-trash` or `fa-xmark`, green with `fa-check`, amber with `fa-triangle-exclamation`, etc.
- **Icon source:** Font Awesome 6 (loaded via CDN in `index.html`). Use
  `<i class="fa-solid fa-icon-name"></i>` for all icons. Common icons:
  `fa-check`, `fa-xmark`, `fa-plus`, `fa-arrows-rotate`, `fa-trash`,
  `fa-gear`, `fa-triangle-exclamation`, `fa-spinner fa-spin` (loading),
  `fa-wand-magic-sparkles` (AI/generate). No Unicode glyphs or emoji.
- **Tooltip implementation:** today, the native HTML `title` attribute.
  If we later need rich tooltips (HTML content, longer delay, dark
  theme), add a custom `appTooltip` directive — don't pull in Material
  CDK just for tooltips.

### Carve-outs (text labels allowed)

| Surface                                                 | Reason                                                                                          |
|---------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| Marketing pages (`/`, `/pricing`, `/about`, `/contact`) | First-time visitors — affordance > density. CTAs like "Start free trial" are full text.         |
| Onboarding wizard (6 steps)                             | Users have never seen the app — "Next →", "Back", "Generate site" stay as text.                  |
| Confirmation dialogs (notification confirm/cancel)      | The two buttons are the entire decision — use text ("Delete", "Cancel") so a misclick isn't catastrophic. |

Inside `/app/*` (claude, builder, settings, integrations, themes,
tenants, media, deployments, analytics, dashboard, marketplace, sites,
domains, leads, studio): **icon-only**.

## Form Standard

| Element        | Convention                                                               |
|----------------|--------------------------------------------------------------------------|
| Input          | `<input class="mc-input" formControlName="...">` (or `[(ngModel)]` for trivial filters) |
| Label          | `<label class="mc-label">…</label>` immediately preceding the input      |
| Textarea       | `<textarea class="mc-input min-h-32">`                                   |
| Select         | `<select class="mc-input">…</select>`                                    |
| Reactive forms | `FormBuilder.nonNullable.group({...})` — never template-driven for non-trivial forms |
| Validation     | Inline `@if (form.controls.x.invalid && form.controls.x.touched)` block under the input; `NotificationService.error(...)` for submit failures |
| Required hint  | `*` in the label text + `Validators.required` in the form group          |

## Modal / Dialog Standard

There is **no** Angular Material dialog in this project. Modals are
inline Tailwind overlays:

```html
@if (open()) {
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
    <div class="mc-card w-full max-w-xl max-h-[90vh] flex flex-col">
      <!-- header -->
      <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <h2 class="mc-heading text-lg font-semibold">Title</h2>
        <button class="mc-btn-ghost !px-2 !py-1" (click)="close()" title="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <!-- content -->
      <div class="px-6 py-4 overflow-y-auto flex-1">…</div>
      <!-- footer (operator app: icon-only) -->
      <div class="px-6 py-3 border-t border-white/5 flex items-center justify-end gap-2">
        <button class="mc-btn-ghost   !px-3 !py-2" (click)="close()" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
        <button class="mc-btn-primary !px-3 !py-2" (click)="save()"
                [disabled]="saving() || form.invalid"
                [title]="saving() ? 'Saving…' : (form.invalid ? 'Save — fix validation errors first' : 'Save')">
          @if (saving()) { <i class="fa-solid fa-spinner fa-spin"></i> } @else { <i class="fa-solid fa-check"></i> }
        </button>
      </div>
    </div>
  </div>
}
```

Modals only close via explicit close/cancel/submit buttons — never on backdrop click. Width:
`max-w-md` (420px) for confirms, `max-w-xl` (576px) for forms,
`max-w-2xl` (672px) for editors.

**No backdrop-click-to-close.** Modals/dialogs must only close when the
user clicks a close, cancel, or submit button. Never add `(click)` on
the backdrop overlay or `stopPropagation` on the inner card.

## Toast / Confirm Standard

Backed by `NotificationService` at
`apps/web/src/app/core/services/notification.service.ts`.

| API                                                                        | Behaviour                                                                  |
|----------------------------------------------------------------------------|----------------------------------------------------------------------------|
| `success(msg)` / `error(msg)` / `warning(msg)` / `info(msg)`               | Signal-based toast queue rendered by `ToastsHost` in the dashboard layout. |
| `confirm(title, body, { confirmLabel?, cancelLabel?, danger? })`           | Returns `Observable<boolean>`. Opens `ConfirmOverlayComponent` (modal).    |

`ConfirmOverlayComponent` lives at
`apps/web/src/app/core/components/confirm-overlay.component.ts`.

**Never** call `window.confirm()` / `window.alert()` directly.

The confirm dialog's two buttons are a Button Standard carve-out — they
show text labels ("Delete", "Cancel") because the two buttons are the
entire decision and a misclick on an icon could be destructive.

## Data Display Standard

No Material table. Use either:

- **Card list** — `<div class="space-y-2">` of `mc-card-hover` rows.
- **Grid** — `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3` of `mc-card`.
- **HTML table** — `<table class="w-full">` with custom Tailwind row styles, ONLY where columnar data is genuinely tabular.

Always provide:
- Empty state (`mc-card p-12 text-center`) when zero rows.
- Skeleton loaders (block `bg-white/10 animate-pulse`) while initial fetch is in flight — never blank-while-loading.

## Animation Standard

Defined in `tailwind.config.js`:

| Name                                | Class             | Usage                                  |
|-------------------------------------|-------------------|----------------------------------------|
| `fade-in`                           | `animate-fade-in` | Modal / overlay appearance             |
| `fade-up`                           | `animate-fade-up` | Page content first paint               |
| `shimmer`                           | `animate-shimmer` | Skeleton placeholders                  |
| `float`                             | `animate-float`   | Hero illustrations                     |
| `animate-pulse` (Tailwind built-in) |                   | Skeleton fills                         |

Transitions: stick to `transition-all duration-200 ease-out` for hover
states, `duration-300` for layout shifts. The `mc-btn` and `mc-card-hover`
classes already bake these in.

## API / Service Standard

| Standard         | Rule                                                                                       |
|------------------|--------------------------------------------------------------------------------------------|
| HTTP base        | `environment.apiBaseUrl` resolving to `http://localhost:3000/v1` (dev) or `https://madcreateapi.madleads.ai/v1` (prod). No `proxy.conf.json`. |
| HTTP client      | `ApiService.get/post/patch/delete<T>(path, body?, params?)` at `apps/web/src/app/core/services/api.service.ts`. Unwraps `{ ok, data }` envelope; throws `Error` on `{ ok: false }`. |
| Error handling   | Catch in the component's `.subscribe({ error })` and route to `NotificationService.error(...)`. |
| Loading states   | Per-component `loading = signal(true)` flipped in next/error of the call. Pages render skeletons while `loading()` is true. |
| Auth             | JWT bearer attached by an HTTP interceptor at app bootstrap. Services never touch tokens directly. |
| Worker bypass    | `X-Worker-Token` header (set by `.claude/worker/worker-iteration.ps1` and `scanner-iteration.ps1`) is accepted by `JwtAuthGuard` via constant-time `safeEqual` against `process.env.CLAUDE_WORKER_TOKEN`. |
| Real data only   | No hard-coded mock arrays in components — every value from a live API call.                |

## Angular Code Standard

| Rule                                | Why                                                                |
|-------------------------------------|--------------------------------------------------------------------|
| `standalone: true` everywhere       | Project convention — never `NgModule`-declared.                    |
| Control flow                        | `@if`, `@for`, `@switch` — NEVER `*ngIf`, `*ngFor`, `*ngSwitch`.    |
| `ChangeDetectionStrategy.OnPush`    | All components. Use `signal()` / `computed()` for state.           |
| Signals over `BehaviorSubject`      | Prefer `signal<T>()` + `computed()` for component state. Streams remain for HTTP. |
| `NgZone.run(...)`                   | Wrap clipboard / browser-promise callbacks so signals re-render.   |
| File paths                          | Always `C:/Code/madcreate/...` in this repo — never other user home directories. |

## NestJS / Prisma Standard

| Rule                          | Why                                                                                          |
|-------------------------------|----------------------------------------------------------------------------------------------|
| Schema source of truth        | `prisma/schema.prisma`. Run `npx prisma generate` after edits; `prisma db push` runs at deploy. |
| Enums                         | Add to `schema.prisma`, then mirror in `class-validator` `@IsIn(['…'] as const)` in the DTO. |
| Route ordering                | Literal-segment routes (`@Get('next')`, `@Post('import-bulk')`) MUST come before `:id` params — `ParseIntPipe` 400s otherwise. |
| DTOs                          | Every property needs a `class-validator` decorator. `ValidationPipe` runs with `whitelist: true, forbidNonWhitelisted: true`. |
| Partial updates               | Service `update()` must check `if (dto.field !== undefined)` — the worker PATCHes partial bodies. |
| Transactions                  | Long-running ops use `$transaction(..., { timeout: 30_000 })` (DreamHost MySQL has a tight idle timeout). |
| P1017 retry                   | One-shot retry via `$disconnect()` + `$connect()` for "server closed the connection". See `site-applicator.service.ts`. |
| Auth                          | `JwtAuthGuard` is global. Public endpoints opt out with `@Public()`. Worker-token bypass is in the guard itself. |

## Dev Workflow

| Step       | Command                                                                                                |
|------------|--------------------------------------------------------------------------------------------------------|
| Redis      | `redis-server --daemonize yes` — must run before API (BullMQ).                                         |
| API        | `npm --workspace @madcreate/api run start:dev` — `nest start --watch`, port 3000 in dev.               |
| Frontend   | `cd apps/web && npm start` — `ng serve --host 0.0.0.0 --port 4200`.                                    |
| Build FE   | `npm --workspace @madcreate/web run build` (production via `angular.json` config).                     |
| Build API  | `npm --workspace @madcreate/api run build` (`nest build`).                                             |
| Prisma     | `npx prisma generate` after schema edits.                                                              |
| Deploy     | `pwsh deploy.ps1` from repo root — only when explicitly requested. Builds, atomic-swaps FE + API on the VPS, runs `prisma db push`, reloads PM2, verifies `/v1/health`. |

## /claude Task Queue Standard

Operator UI lives at `https://madcreate.madleads.ai/app/claude`. The
autonomous worker drains it; the scanner feeds it.

| Property             | Value                                                                                                            |
|----------------------|------------------------------------------------------------------------------------------------------------------|
| Queue list endpoint  | `GET /v1/claude-tasks` (bucketed: active → to-deploy → terminal)                                                 |
| Worker poll endpoint | `GET /v1/claude-tasks/next` — 200 `{ ok, data: { task } }` or 204 empty                                          |
| Bulk import          | `POST /v1/claude-tasks/import-bulk` — dedupes by trim+lowercase title against active queue (PENDING + IN_PROGRESS) |
| Auth                 | All endpoints behind `JwtAuthGuard` + `X-Worker-Token` bypass                                                    |
| Statuses             | `PENDING`, `IN_PROGRESS`, `TO_BE_DEPLOYED`, `COMPLETED`, `CANCELLED`, **`FAILED`** (terminal, no retry), **`DEFERRED`** (operator-input needed — flip back to PENDING when ready) |
| Priority             | `1=Critical, 2=High, 3=Normal (default), 4=Low`                                                                   |
| Worker cron          | Windows Task Scheduler `MADCreateWorker` — every 1 minute, adaptive stride 1m → 5m → 10m → 30m → 1h via empty-streak counter, reset on hit. Prompt: `.claude/worker/worker-prompt.md`. |
| Scanner cron         | Windows Task Scheduler `MADCreateScanner` — every 1 hour. Read-only scan; POSTs new findings via import-bulk. Prompt: `.claude/scanner/scanner-prompt.md`. |
| Worker state         | `.claude/worker/state.json` (`{ streak, lastFiredAt }`)                                                          |
| Scanner state        | `.claude/scanner/state.json` (`{ lastRanAt }`)                                                                   |
| Worker log           | `.claude/worker/worker.log`                                                                                      |
| Scanner log          | `.claude/scanner/scanner.log`                                                                                    |
| Parallel agents      | Worker may spawn 2–4 `Agent` tool uses concurrently when it identifies independent tasks. Site-generation tasks always run solo. |

---

*Update this file whenever a new pattern lands. Stale standards docs are
worse than missing ones — when adding a section, also update the
"Last reviewed" line at the top.*
