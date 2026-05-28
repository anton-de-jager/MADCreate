import { Component, ChangeDetectionStrategy, inject, signal, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

interface TenantDetail { id: string; slug: string; name: string; status: string; industry?: string | null; description?: string | null; sites: { id: string; name: string; status: string }[]; domains: { id: string; hostname: string; status: string; isPrimary: boolean }[]; }

@Component({
  selector: 'mc-tenant-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (tenant(); as t) {
    <div class="flex items-start justify-between mb-8">
      <div>
        <a routerLink="/app/tenants" class="text-sm text-fg-muted hover:text-fg">← Tenants</a>
        <h1 class="mc-heading text-3xl font-bold mt-1">{{ t.name }}</h1>
        <p class="text-fg-muted mt-1">/{{ t.slug }} · {{ t.status }}</p>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <a [routerLink]="['/app/onboarding', t.id]" class="mc-btn-ghost" title="Re-run the onboarding wizard for this tenant — replaces the site, doesn't duplicate the tenant"><i class="fa-solid fa-pen"></i> Edit onboarding</a>
        <a [routerLink]="['/app/studio', t.id]" class="mc-btn-secondary"><i class="fa-solid fa-wand-magic-sparkles"></i> Studio</a>
        <a routerLink="/app/domains" class="mc-btn-ghost"><i class="fa-solid fa-link"></i> Domains</a>
        <a routerLink="/app/deployments" class="mc-btn-ghost"><i class="fa-solid fa-rocket"></i> Deploy</a>
        <a routerLink="/app/analytics" class="mc-btn-ghost"><i class="fa-solid fa-chart-line"></i> Analytics</a>
        <a [href]="'/' + t.slug" target="_blank" class="mc-btn-primary">View site →</a>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-5">
      <div class="lg:col-span-2 space-y-5">
        <div class="mc-card p-6">
          <div class="text-xs text-fg-subtle uppercase tracking-wider mb-2">About</div>
          <p class="text-sm text-fg-muted">{{ t.description ?? 'No description yet.' }}</p>
          <div class="mt-4 text-xs text-fg-subtle">Industry: {{ t.industry ?? '—' }}</div>
        </div>

        <div class="mc-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="mc-heading text-lg font-semibold">Sites</h2>
            <a [routerLink]="['/app/sites']" [queryParams]="{ tenantId: t.id }" class="text-sm text-brand hover:underline">All →</a>
          </div>
          @if (t.sites.length === 0) {
            <div class="rounded-md border border-white/5 p-4">
              <p class="text-sm text-fg-muted mb-3">No sites yet.</p>
              <div class="flex flex-wrap gap-2">
                <a [routerLink]="['/app/studio', t.id]" class="mc-btn-secondary text-sm">Open Studio</a>
                <a [routerLink]="['/app/onboarding', t.id]" class="mc-btn-primary text-sm">Generate site</a>
                <a routerLink="/app/marketplace" class="mc-btn-ghost text-sm">Browse templates</a>
              </div>
            </div>
          } @else {
            <ul class="space-y-2">
              @for (s of t.sites; track s.id) {
                <li class="flex items-center justify-between p-3 rounded-md border border-white/5 hover:border-white/10">
                  <a [routerLink]="['/app/sites', s.id]" class="font-medium hover:text-brand">{{ s.name }}</a>
                  <div class="flex items-center gap-2">
                    <span class="mc-chip">{{ s.status }}</span>
                    <a [routerLink]="['/app/sites', s.id]" class="mc-btn-ghost text-xs">Manage</a>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </div>

      <div class="space-y-5">
        <div class="mc-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="mc-heading text-lg font-semibold">Domains</h2>
            <a routerLink="/app/domains" class="text-sm text-brand hover:underline">Manage →</a>
          </div>
          @if (t.domains.length === 0) {
            <div>
              <p class="text-sm text-fg-muted mb-3">No domains attached.</p>
              <a routerLink="/app/domains" class="mc-btn-secondary text-sm">Connect domain</a>
            </div>
          } @else {
            <ul class="space-y-2 text-sm">
              @for (d of t.domains; track d.id) {
                <li class="flex items-center justify-between p-2 rounded border border-white/5">
                  <span class="font-mono text-xs">{{ d.hostname }}</span>
                  <span class="mc-chip">{{ d.status }}</span>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    </div>
  } @else if (loading()) {
    <div class="mc-card p-8 text-center text-fg-muted">Loading…</div>
  } @else if (error()) {
    <div class="mc-card p-6 text-danger text-sm">{{ error() }}</div>
  }
  `,
})
export class TenantDetailPage implements OnInit {
  private readonly api = inject(ApiService);
  @Input() id!: string;

  protected readonly tenant = signal<TenantDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    this.api.get<TenantDetail>(`/tenants/${this.id}`).subscribe({
      next: (t) => { this.tenant.set(t); this.loading.set(false); },
      error: (e) => { this.error.set(e.message); this.loading.set(false); },
    });
  }
}
