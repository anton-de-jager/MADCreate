import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { TenantContextService } from '../../core/services/tenant-context.service';

interface Site { id: string; name: string; status: string; updatedAt: string; _count?: { pages: number }; theme?: { name: string } | null }

@Component({
  selector: 'mc-sites-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="mc-heading text-3xl font-bold">Sites</h1>
      <p class="text-fg-muted mt-1">Every site in the current tenant.</p>
    </div>
  </div>

  @if (!tenant()) {
    <div class="mc-card p-8 text-center">
      <p class="text-fg-muted mb-3">Pick a tenant first.</p>
      <a routerLink="/app/tenants" class="mc-btn-primary">Go to tenants</a>
    </div>
  } @else if (loading()) {
    <div class="mc-card p-8 text-center text-fg-muted">Loading…</div>
  } @else {
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (s of items(); track s.id) {
        <a [routerLink]="['/app/sites', s.id]" class="mc-card-hover p-5 group">
          <div class="flex items-start justify-between">
            <div>
              <div class="mc-heading font-semibold group-hover:text-brand transition-colors">{{ s.name }}</div>
              <div class="text-xs text-fg-subtle mt-1">{{ s._count?.pages ?? 0 }} pages</div>
            </div>
            <span class="mc-chip">{{ s.status }}</span>
          </div>
          @if (s.theme) {
            <div class="mt-3 text-xs text-fg-muted">Theme: {{ s.theme.name }}</div>
          }
        </a>
      }
      @if (items().length === 0) {
        <div class="mc-card p-8 text-center col-span-full">
          <p class="text-fg-muted mb-3">No sites yet for this tenant.</p>
          <a routerLink="/app/onboarding" class="mc-btn-primary">Generate one with AI</a>
        </div>
      }
    </div>
  }
  `,
})
export class SitesListPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly tenantCtx = inject(TenantContextService);
  protected readonly tenant = this.tenantCtx.current;
  protected readonly items = signal<Site[]>([]);
  protected readonly loading = signal(true);

  ngOnInit() {
    const t = this.tenant();
    if (!t) { this.loading.set(false); return; }
    this.api.get<Site[]>('/sites', { tenantId: t.id }).subscribe({
      next: (s) => { this.items.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
