import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { NotificationService } from '../../core/services/notification.service';

interface Template { id: string; slug: string; name: string; description?: string | null; category?: string | null; industry?: string | null; thumbnailUrl?: string | null; popularity: number; }
interface PageSummary { id: string; slug: string; title: string; status: string; order: number; }
interface TenantSummary { id: string; slug: string; name: string; }

@Component({
  selector: 'mc-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="mb-8">
    <h1 class="mc-heading text-3xl font-bold">Marketplace</h1>
    <p class="text-fg-muted mt-1">Start from a proven template — clones into one of your tenants as a new site draft.</p>
  </div>

  <div class="mc-card p-4 mb-6 flex items-center gap-3">
    <input class="mc-input" placeholder="Search…" [(ngModel)]="searchText" name="search" (ngModelChange)="refresh()" />
    <input class="mc-input md:!w-48" placeholder="Industry" [(ngModel)]="industryText" name="industry" (ngModelChange)="refresh()" />
  </div>

  @if (loading()) {
    <!-- Six skeleton template cards in the same 3-col grid as the loaded view. -->
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (_ of [1,2,3,4,5,6]; track _) {
        <div class="mc-card p-5 flex flex-col">
          <div class="aspect-[16/10] rounded bg-white/10 animate-pulse mb-4"></div>
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-2 flex-1">
              <div class="h-4 w-32 rounded bg-white/10 animate-pulse"></div>
              <div class="h-3 w-24 rounded bg-white/10 animate-pulse"></div>
            </div>
            <div class="h-5 w-10 rounded bg-white/10 animate-pulse"></div>
          </div>
          <div class="h-3 w-full rounded bg-white/10 animate-pulse mt-3"></div>
          <div class="h-9 w-full rounded bg-white/10 animate-pulse mt-3"></div>
        </div>
      }
    </div>
  } @else {
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (t of items(); track t.id) {
        <div class="mc-card-hover p-5 flex flex-col">
          <div class="aspect-[16/10] rounded bg-surface-subtle mb-4 overflow-hidden">
            @if (t.thumbnailUrl) { <img [src]="t.thumbnailUrl" [alt]="t.name" class="w-full h-full object-cover" /> }
          </div>
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="mc-heading font-semibold">{{ t.name }}</div>
              <div class="text-xs text-fg-subtle">{{ t.category }} · {{ t.industry ?? 'general' }}</div>
            </div>
            <span class="mc-chip text-[10px]"><i class="fa-solid fa-star"></i> {{ t.popularity }}</span>
          </div>
          <p class="text-sm text-fg-muted mt-2 line-clamp-2 min-h-[2.5rem]">{{ t.description }}</p>
          <button class="mc-btn-primary text-sm mt-3"
                  [disabled]="instantiatingSlug() === t.slug"
                  (click)="useTemplate(t)">
            {{ instantiatingSlug() === t.slug ? 'Creating site…' : 'Use template →' }}
          </button>
        </div>
      }
      @if (items().length === 0) {
        <div class="mc-card p-12 text-center col-span-full text-fg-muted">
          <p>No public templates yet — the seed only creates demo data.</p>
          <p class="text-xs mt-1">Add some via the admin panel or seed file.</p>
        </div>
      }
    </div>
  }

  <!-- Tenant picker — shown when 'Use template' is clicked but no tenant is in context. -->
  @if (showTenantPicker(); as pending) {
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div class="mc-card w-full max-w-md p-6">
        <h2 class="mc-heading text-lg font-semibold mb-2">Pick a tenant</h2>
        <p class="text-xs text-fg-muted mb-4">
          Cloning <b>{{ pending.name }}</b> as a new site under which tenant?
        </p>
        @if (tenants().length === 0) {
          <p class="text-sm text-fg-muted">No tenants yet — create one first.</p>
        } @else {
          <div class="space-y-2 max-h-72 overflow-y-auto">
            @for (t of tenants(); track t.id) {
              <button class="w-full text-left p-3 rounded border border-white/5 hover:border-brand/40 hover:bg-white/[0.02] transition-colors"
                      [disabled]="instantiatingSlug() === pending.slug"
                      (click)="instantiate(pending, t.id)">
                <div class="font-medium">{{ t.name }}</div>
                <div class="text-xs text-fg-subtle">/{{ t.slug }}</div>
              </button>
            }
          </div>
        }
        <div class="flex justify-end mt-4">
          <button class="mc-btn-ghost text-sm" (click)="closeTenantPicker()">Cancel</button>
        </div>
      </div>
    </div>
  }
  `,
})
export class MarketplacePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected searchText = '';
  protected industryText = '';
  protected readonly items = signal<Template[]>([]);
  protected readonly tenants = signal<TenantSummary[]>([]);
  protected readonly showTenantPicker = signal<Template | null>(null);
  protected readonly instantiatingSlug = signal<string | null>(null);
  protected readonly loading = signal(true);

  ngOnInit() {
    this.refresh();
    // Pre-fetch the workspace's tenants so the picker is instant.
    const ws = this.auth.currentWorkspace();
    if (ws) {
      this.api.get<TenantSummary[]>('/tenants', { workspaceId: ws.workspaceId }).subscribe({
        next: (rows) => this.tenants.set(rows),
        error: () => this.notify.error('Failed to load tenant.'),
      });
    }
  }

  protected refresh() {
    this.api.get<Template[]>('/templates', {
      search: this.searchText || undefined,
      industry: this.industryText || undefined,
    }).subscribe({
      next: (t) => { this.items.set(t); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Failed to load templates.'); },
    });
  }

  /**
   * Click handler — uses the current tenant from TenantContextService if
   * present, else pops a picker showing every tenant in the workspace.
   */
  protected useTemplate(t: Template) {
    const ctx = this.tenantCtx.current();
    if (ctx?.id) {
      this.instantiate(t, ctx.id);
    } else {
      this.showTenantPicker.set(t);
    }
  }

  protected closeTenantPicker() { this.showTenantPicker.set(null); }

  protected instantiate(t: Template, tenantId: string) {
    this.instantiatingSlug.set(t.slug);
    this.api.post<{ id: string; tenantId: string; pages: PageSummary[] }>(
      `/templates/${t.slug}/instantiate`,
      null,
      { tenantId },
    ).subscribe({
      next: (site) => {
        this.instantiatingSlug.set(null);
        this.closeTenantPicker();
        this.notify.success(`Created site from "${t.name}".`);
        this.router.navigate(['/app/sites', site.id]);
      },
      error: (e: Error) => {
        this.instantiatingSlug.set(null);
        this.notify.error(`Couldn't apply template: ${e.message}`);
      },
    });
  }
}
