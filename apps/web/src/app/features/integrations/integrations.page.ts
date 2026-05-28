import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { NotificationService } from '../../core/services/notification.service';

interface ConfigField {
  name: string;
  label: string;
  type?: 'text' | 'password' | 'boolean';
  required?: boolean;
}
interface ConfigSchema {
  fields: ConfigField[];
}
interface Catalog {
  id: string;
  key: string;
  name: string;
  category: string;
  description?: string | null;
  iconUrl?: string | null;
  configSchema?: ConfigSchema | null;
}
interface Installed { id: string; catalog: Catalog; isEnabled: boolean; }

@Component({
  selector: 'mc-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="mb-8">
    <h1 class="mc-heading text-3xl font-bold">Integrations</h1>
    <p class="text-fg-muted mt-1">Connect the rest of your stack.</p>
  </div>

  @if (!tenant()) {
    <div class="mc-card p-8 text-center">
      <p class="text-fg-muted mb-3">Pick a tenant first.</p>
      <a routerLink="/app/tenants" class="mc-btn-primary">Go to tenants</a>
    </div>
  } @else if (loading()) {
    <!-- Two skeleton "categories" of three cards each — mirrors the real grid. -->
    @for (_ of [1,2]; track _) {
      <div class="h-3 w-32 rounded bg-white/10 animate-pulse mt-8 mb-3"></div>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        @for (__ of [1,2,3]; track __) {
          <div class="mc-card p-4 flex items-start gap-3">
            <div class="w-10 h-10 rounded bg-white/10 animate-pulse shrink-0"></div>
            <div class="flex-1 min-w-0 space-y-2">
              <div class="h-4 w-24 rounded bg-white/10 animate-pulse"></div>
              <div class="h-3 w-full rounded bg-white/10 animate-pulse"></div>
            </div>
          </div>
        }
      </div>
    }
  } @else if (catalog().length === 0) {
    <div class="mc-card p-8 text-center">
      <p class="text-fg-muted mb-2">No integrations are available yet.</p>
      <p class="text-xs text-fg-subtle mb-5">MADCreate uses MADCloud for generation and Payfast.io for payments.</p>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <a routerLink="/app/settings" [queryParams]="{ tab: 'billing' }" class="mc-btn-primary">Open Payfast billing</a>
        <a routerLink="/app/growth" class="mc-btn-secondary">Open Growth Hub</a>
      </div>
    </div>
  } @else {
    @for (cat of categories(); track cat) {
      <h2 class="mc-heading text-sm uppercase tracking-wider text-fg-subtle mt-8 mb-3">{{ cat }}</h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        @for (c of catalog(); track c.id) {
          @if (c.category === cat) {
            <div class="mc-card-hover p-4 flex items-start gap-3">
              <div class="w-10 h-10 rounded bg-brand/10 grid place-items-center text-brand font-semibold uppercase text-sm shrink-0">
                @if (c.iconUrl) {
                  <img [src]="c.iconUrl" [alt]="c.name" class="w-full h-full object-contain rounded" />
                } @else {
                  {{ c.name[0] }}
                }
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ c.name }}</div>
                <div class="text-xs text-fg-muted line-clamp-2">{{ c.description }}</div>
              </div>
              @if (isInstalled(c.key)) {
                <button class="mc-chip cursor-pointer hover:bg-danger/20 hover:text-danger" (click)="uninstall(c.key)">Installed</button>
              } @else {
                <button class="mc-btn-secondary text-xs" (click)="openInstallModal(c)"><i class="fa-solid fa-plus"></i> Add</button>
              }
            </div>
          }
        }
      </div>
    }
  }

  <!-- Install modal -->
  @if (installing(); as inst) {
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div class="mc-card w-full max-w-lg max-h-[90vh] flex flex-col">
        <div class="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div class="w-10 h-10 rounded bg-brand/10 grid place-items-center text-brand font-semibold uppercase text-sm shrink-0">
            @if (inst.iconUrl) {
              <img [src]="inst.iconUrl" [alt]="inst.name" class="w-full h-full object-contain rounded" />
            } @else {
              {{ inst.name[0] }}
            }
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="mc-heading text-lg font-semibold truncate">Connect {{ inst.name }}</h2>
            @if (inst.description) {
              <p class="text-xs text-fg-muted line-clamp-1">{{ inst.description }}</p>
            }
          </div>
          <button class="mc-btn-ghost !px-2 !py-1 text-sm" (click)="closeInstallModal()"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          @if (fields().length === 0) {
            <div class="text-sm text-fg-muted">No configuration required for {{ inst.name }}.</div>
          } @else {
            @for (f of fields(); track f.name) {
              <div>
                <label class="mc-label" [for]="'cfg-' + f.name">
                  {{ f.label }}
                  @if (f.required) { <span class="text-danger">*</span> }
                </label>
                @switch (f.type ?? 'text') {
                  @case ('boolean') {
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        [id]="'cfg-' + f.name"
                        class="h-4 w-4 rounded border-white/20 bg-white/5 text-brand"
                        [checked]="!!formValues()[f.name]"
                        (change)="setField(f.name, $any($event.target).checked)" />
                      <span class="text-sm text-fg-muted">Enabled</span>
                    </label>
                  }
                  @case ('password') {
                    <input
                      [id]="'cfg-' + f.name"
                      type="password"
                      class="mc-input"
                      autocomplete="off"
                      [value]="formValues()[f.name] ?? ''"
                      (input)="setField(f.name, $any($event.target).value)"
                      (blur)="touch(f.name)" />
                  }
                  @default {
                    <input
                      [id]="'cfg-' + f.name"
                      type="text"
                      class="mc-input"
                      [value]="formValues()[f.name] ?? ''"
                      (input)="setField(f.name, $any($event.target).value)"
                      (blur)="touch(f.name)" />
                  }
                }
                @if (f.required && touched()[f.name] && isEmpty(formValues()[f.name])) {
                  <div class="text-xs text-danger mt-1">{{ f.label }} is required.</div>
                }
              </div>
            }
          }
          @if (installError()) {
            <div class="text-sm text-danger">{{ installError() }}</div>
          }
        </div>

        <div class="px-6 py-3 border-t border-white/5 flex items-center justify-end gap-2">
          <button class="mc-btn-ghost !px-4 !py-2 text-sm" (click)="closeInstallModal()">Cancel</button>
          <button
            class="mc-btn-primary !px-4 !py-2 text-sm"
            [disabled]="installSaving() || !canSubmit()"
            (click)="submitInstall()">
            {{ installSaving() ? 'Installing…' : 'Install' }}
          </button>
        </div>
      </div>
    </div>
  }
  `,
})
export class IntegrationsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly notify = inject(NotificationService);
  protected readonly tenant = this.tenantCtx.current;

  protected readonly catalog = signal<Catalog[]>([]);
  protected readonly installed = signal<Installed[]>([]);
  protected readonly loading = signal(true);

  // Install-modal state
  protected readonly installing = signal<Catalog | null>(null);
  protected readonly formValues = signal<Record<string, unknown>>({});
  protected readonly touched = signal<Record<string, boolean>>({});
  protected readonly installSaving = signal(false);
  protected readonly installError = signal<string | null>(null);

  protected readonly fields = computed<ConfigField[]>(() => {
    const inst = this.installing();
    return inst?.configSchema?.fields ?? [];
  });

  protected readonly canSubmit = computed(() => {
    const values = this.formValues();
    for (const f of this.fields()) {
      if (f.required && this.isEmpty(values[f.name])) return false;
    }
    return true;
  });

  ngOnInit() {
    this.api.get<Catalog[]>('/integrations/catalog').subscribe({
      next: (c) => { this.catalog.set(c); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.refreshInstalled();
  }

  refreshInstalled() {
    const t = this.tenant(); if (!t) return;
    this.api.get<Installed[]>('/integrations/installed', { tenantId: t.id }).subscribe({ next: (i) => this.installed.set(i), error: (e: Error) => this.notify.error(e.message ?? 'Failed to load integrations') });
  }

  protected categories() {
    return [...new Set(this.catalog().map((c) => c.category))];
  }

  protected isInstalled(key: string): boolean {
    return this.installed().some((i) => i.catalog.key === key && i.isEnabled);
  }

  protected openInstallModal(c: Catalog) {
    // Seed defaults: boolean fields default to false, others to ''.
    const initial: Record<string, unknown> = {};
    for (const f of c.configSchema?.fields ?? []) {
      initial[f.name] = f.type === 'boolean' ? false : '';
    }
    this.formValues.set(initial);
    this.touched.set({});
    this.installError.set(null);
    this.installing.set(c);
  }

  protected closeInstallModal() {
    this.installing.set(null);
    this.installSaving.set(false);
    this.installError.set(null);
  }

  protected setField(name: string, value: unknown) {
    this.formValues.update((v) => ({ ...v, [name]: value }));
  }

  protected touch(name: string) {
    this.touched.update((t) => (t[name] ? t : { ...t, [name]: true }));
  }

  protected isEmpty(v: unknown): boolean {
    return v === undefined || v === null || v === '';
  }

  protected submitInstall() {
    const t = this.tenant();
    const inst = this.installing();
    if (!t || !inst) return;

    // Mark every required field touched so the user sees all missing-field
    // messages at once if they hit Install too early.
    const allTouched: Record<string, boolean> = {};
    for (const f of this.fields()) allTouched[f.name] = true;
    this.touched.set(allTouched);

    if (!this.canSubmit()) return;

    // Strip empty optional strings — the server can recognize "field present"
    // vs "field omitted" cleanly.
    const raw = this.formValues();
    const config: Record<string, unknown> = {};
    for (const f of this.fields()) {
      const val = raw[f.name];
      if (f.type === 'boolean') {
        config[f.name] = !!val;
      } else if (!this.isEmpty(val)) {
        config[f.name] = val;
      }
    }

    this.installSaving.set(true);
    this.installError.set(null);
    this.api
      .post('/integrations/install', { catalogKey: inst.key, config }, { tenantId: t.id })
      .subscribe({
        next: () => {
          this.installSaving.set(false);
          const name = inst.name;
          this.closeInstallModal();
          this.refreshInstalled();
          this.notify.success(`${name} installed.`);
        },
        error: (e: Error) => {
          this.installSaving.set(false);
          const msg = e.message || 'Install failed.';
          this.installError.set(msg);
          this.notify.error(msg);
        },
      });
  }

  protected uninstall(key: string) {
    const t = this.tenant(); if (!t) return;
    const i = this.installed().find((x) => x.catalog.key === key);
    if (!i) return;
    const name = i.catalog.name;
    this.notify.confirm(
      `Uninstall ${name}?`,
      `This removes the ${name} integration and its stored configuration from this tenant.`,
      { confirmLabel: 'Uninstall', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/integrations/${i.id}`, { tenantId: t.id }).subscribe({
        next: () => { this.refreshInstalled(); this.notify.success(`${name} uninstalled.`); },
        error: (e: Error) => this.notify.error(e.message ?? 'Something went wrong'),
      });
    });
  }
}
