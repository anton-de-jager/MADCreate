import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

interface Overview { workspaces: number; tenants: number; users: number; sites: number; deployments: number; aiGenerations: number; customDomains: number; }
interface AdminTenant { id: string; slug: string; name: string; status: string; workspace: { id: string; name: string; slug: string }; ownerEmail: string | null; siteCount: number; lastDeploy: string | null; createdAt: string; }

const STATUSES = ['', 'DRAFT', 'GENERATING', 'READY', 'PUBLISHED', 'ARCHIVED'];

@Component({
  selector: 'mc-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="mb-8">
    <h1 class="mc-heading text-3xl font-bold">Super admin</h1>
    <p class="text-fg-muted mt-1">Cross-tenant platform view.</p>
  </div>

  @if (overview(); as o) {
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
      <div class="mc-card p-4"><div class="text-xs text-fg-subtle">Workspaces</div><div class="mc-heading text-2xl font-bold">{{ o.workspaces }}</div></div>
      <div class="mc-card p-4"><div class="text-xs text-fg-subtle">Tenants</div><div class="mc-heading text-2xl font-bold">{{ o.tenants }}</div></div>
      <div class="mc-card p-4"><div class="text-xs text-fg-subtle">Users</div><div class="mc-heading text-2xl font-bold">{{ o.users }}</div></div>
      <div class="mc-card p-4"><div class="text-xs text-fg-subtle">Sites</div><div class="mc-heading text-2xl font-bold">{{ o.sites }}</div></div>
      <div class="mc-card p-4"><div class="text-xs text-fg-subtle">Deploys</div><div class="mc-heading text-2xl font-bold">{{ o.deployments }}</div></div>
      <div class="mc-card p-4"><div class="text-xs text-fg-subtle">AI gens</div><div class="mc-heading text-2xl font-bold">{{ o.aiGenerations }}</div></div>
      <div class="mc-card p-4"><div class="text-xs text-fg-subtle">Domains</div><div class="mc-heading text-2xl font-bold">{{ o.customDomains }}</div></div>
    </div>
  }

  <div class="flex items-center justify-between mb-3">
    <h2 class="mc-heading text-xl font-semibold">All tenants</h2>
    <div class="flex items-center gap-2">
      <input class="mc-input !w-56 text-sm" placeholder="Search slug or name…"
             [ngModel]="search()" (ngModelChange)="search.set($event)" (keyup.enter)="refreshTenants()" />
      <select class="mc-input !w-auto text-sm" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event); refreshTenants()">
        <option value="">All statuses</option>
        @for (s of statuses; track s) {
          @if (s) { <option [value]="s">{{ s }}</option> }
        }
      </select>
      <button class="mc-btn-secondary text-sm" (click)="refreshTenants()">Filter</button>
    </div>
  </div>

  <div class="mc-card overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-white/[0.02] text-xs uppercase tracking-wider text-fg-subtle">
        <tr>
          <th class="text-left px-5 py-3">Tenant</th>
          <th class="text-left px-5 py-3">Workspace</th>
          <th class="text-left px-5 py-3">Owner</th>
          <th class="text-left px-5 py-3">Status</th>
          <th class="text-right px-5 py-3">Sites</th>
          <th class="text-left px-5 py-3">Last deploy</th>
          <th class="text-left px-5 py-3">Created</th>
          <th class="text-right px-5 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (t of tenants(); track t.id) {
          <tr class="border-t border-white/5 hover:bg-white/[0.02]">
            <td class="px-5 py-3">
              <div class="font-medium">{{ t.name }}</div>
              <div class="text-xs text-fg-subtle font-mono">/{{ t.slug }}</div>
            </td>
            <td class="px-5 py-3 text-xs">{{ t.workspace.name }}</td>
            <td class="px-5 py-3 text-xs text-fg-muted">{{ t.ownerEmail ?? '—' }}</td>
            <td class="px-5 py-3">
              <span class="mc-chip"
                    [ngClass]="t.status === 'ARCHIVED' ? 'bg-danger/20 text-danger' : ''">{{ t.status }}</span>
            </td>
            <td class="px-5 py-3 text-xs text-right">{{ t.siteCount }}</td>
            <td class="px-5 py-3 text-xs text-fg-muted">{{ t.lastDeploy ? (t.lastDeploy | date:'short') : '—' }}</td>
            <td class="px-5 py-3 text-xs text-fg-muted">{{ t.createdAt | date:'medium' }}</td>
            <td class="px-5 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button class="mc-btn-secondary !px-2 !py-1 text-[10px]" (click)="viewAsTenant(t)">View as</button>
                @if (t.status === 'ARCHIVED') {
                  <button class="mc-btn-secondary !px-2 !py-1 text-[10px]" (click)="unsuspend(t)">Unsuspend</button>
                } @else {
                  <button class="mc-btn-secondary !px-2 !py-1 text-[10px] text-warning" (click)="suspend(t)">Suspend</button>
                }
                <button class="mc-btn-secondary !px-2 !py-1 text-[10px] text-danger" (click)="hardDelete(t)">Delete</button>
              </div>
            </td>
          </tr>
        }
      </tbody>
    </table>
    @if (tenants().length === 0) {
      <div class="p-8 text-center text-fg-muted">No tenants match your filters.</div>
    }
  </div>
  `,
})
export class AdminPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  protected readonly overview = signal<Overview | null>(null);
  protected readonly tenants = signal<AdminTenant[]>([]);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly statuses = STATUSES;

  ngOnInit() {
    this.api.get<Overview>('/admin/overview').subscribe({
      next: (o) => this.overview.set(o),
      error: (e: Error) => this.notify.error(e.message ?? 'Failed to load overview'),
    });
    this.refreshTenants();
  }

  refreshTenants() {
    this.api.get<AdminTenant[]>('/admin/tenants', {
      search: this.search() || undefined,
      status: this.statusFilter() || undefined,
    }).subscribe({
      next: (t) => this.tenants.set(t),
      error: (e: Error) => this.notify.error(e.message ?? 'Failed to load tenants'),
    });
  }

  viewAsTenant(t: AdminTenant) {
    this.router.navigate(['/app/tenants', t.id]);
  }

  suspend(t: AdminTenant) {
    this.notify.confirm(
      `Suspend tenant "${t.name}"?`,
      'This will archive the tenant immediately.',
      { confirmLabel: 'Suspend', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.patch(`/admin/tenants/${t.id}/suspend`, {}).subscribe({
        next: () => { this.refreshTenants(); this.notify.success(`Suspended ${t.name}.`); },
        error: (e: Error) => this.notify.error(e.message ?? 'Suspend failed'),
      });
    });
  }

  unsuspend(t: AdminTenant) {
    this.api.patch(`/admin/tenants/${t.id}/unsuspend`, {}).subscribe({
      next: () => { this.refreshTenants(); this.notify.success(`Unsuspended ${t.name}.`); },
      error: (e: Error) => this.notify.error(e.message ?? 'Unsuspend failed'),
    });
  }

  hardDelete(t: AdminTenant) {
    this.notify.confirm(
      `Permanently delete tenant "${t.name}"?`,
      'This will permanently remove the tenant and all its data. This cannot be undone.',
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/admin/tenants/${t.id}`).subscribe({
        next: () => { this.refreshTenants(); this.notify.success(`Deleted ${t.name}.`); },
        error: (e: Error) => this.notify.error(e.message ?? 'Delete failed'),
      });
    });
  }
}
