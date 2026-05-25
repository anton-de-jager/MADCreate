import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

interface Tenant { id: string; slug: string; name: string; status: string; industry?: string | null; createdAt: string; domains?: { hostname: string; isPrimary: boolean }[] }

@Component({
  selector: 'mc-tenants-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="mc-heading text-3xl font-bold">Tenants</h1>
      <p class="text-fg-muted mt-1">Every site you've ever shipped, in one place.</p>
    </div>
    <a routerLink="/app/onboarding" class="mc-btn-primary"><i class="fa-solid fa-plus"></i> New tenant</a>
  </div>

  @if (loading()) {
    <div class="mc-card p-8 text-center text-fg-muted">Loading…</div>
  } @else if (items().length === 0) {
    <div class="mc-card p-12 text-center">
      <p class="text-fg-muted mb-4">No tenants yet.</p>
      <a routerLink="/app/onboarding" class="mc-btn-primary">Create your first</a>
    </div>
  } @else {
    <div class="mc-card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-white/[0.02] text-fg-subtle text-xs uppercase tracking-wider">
          <tr>
            <th class="text-left px-5 py-3 font-medium">Name</th>
            <th class="text-left px-5 py-3 font-medium hidden md:table-cell">Slug</th>
            <th class="text-left px-5 py-3 font-medium hidden lg:table-cell">Domains</th>
            <th class="text-left px-5 py-3 font-medium">Status</th>
            <th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody>
          @for (t of items(); track t.id) {
            <tr class="border-t border-white/5 hover:bg-white/[0.02] transition-colors group">
              <td class="px-5 py-3">
                <a [routerLink]="['/app/tenants', t.id]" class="font-medium hover:text-brand">{{ t.name }}</a>
                <div class="text-xs text-fg-subtle">{{ t.industry ?? '—' }}</div>
              </td>
              <td class="px-5 py-3 hidden md:table-cell font-mono text-xs text-fg-muted">/{{ t.slug }}</td>
              <td class="px-5 py-3 hidden lg:table-cell text-xs text-fg-muted">
                {{ t.domains?.length || 0 }} domain(s)
              </td>
              <td class="px-5 py-3"><span class="mc-chip">{{ t.status }}</span></td>
              <td class="px-5 py-3 text-right whitespace-nowrap">
                <button type="button"
                        class="mc-btn-ghost text-xs mr-1 opacity-0 group-hover:opacity-100 transition-opacity text-danger"
                        title="Delete this tenant permanently (cascades to sites, pages, sections)"
                        [disabled]="deletingId() === t.id"
                        (click)="deleteTenant(t)">
                  @if (deletingId() === t.id) { … } @else { <i class="fa-solid fa-xmark"></i> Delete }
                </button>
                <a [routerLink]="['/app/onboarding', t.id]" class="mc-btn-ghost text-xs mr-1" title="Re-run the onboarding wizard for this tenant — replaces the site, does not duplicate the tenant"><i class="fa-solid fa-pen"></i> Edit</a>
                <a [routerLink]="['/app/studio', t.id]" class="mc-btn-ghost text-xs">Studio →</a>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
  `,
})
export class TenantsListPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  protected readonly items = signal<Tenant[]>([]);
  protected readonly loading = signal(true);
  /** Tenant currently being deleted — UI shows a spinner on that row. */
  protected readonly deletingId = signal<string | null>(null);

  ngOnInit() {
    this.refresh();
  }

  private refresh() {
    const ws = this.auth.currentWorkspace();
    if (!ws) { this.loading.set(false); return; }
    this.loading.set(true);
    this.api.get<Tenant[]>('/tenants', { workspaceId: ws.workspaceId }).subscribe({
      next: (t) => { this.items.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected deleteTenant(t: Tenant) {
    this.notify.confirm(
      `Delete tenant "${t.name}"?`,
      `This cascades to its sites, pages, and sections — and is not reversible yet.\n\nSlug: /${t.slug}`,
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.deletingId.set(t.id);
      this.api.delete(`/tenants/${t.id}`).subscribe({
        next: () => {
          this.deletingId.set(null);
          // Optimistically drop the row, then refresh from the server to stay honest.
          this.items.set(this.items().filter((x) => x.id !== t.id));
          this.refresh();
          this.notify.success(`Tenant "${t.name}" deleted.`);
        },
        error: (e: Error) => {
          this.deletingId.set(null);
          this.notify.error('Delete failed: ' + e.message);
        },
      });
    });
  }
}
