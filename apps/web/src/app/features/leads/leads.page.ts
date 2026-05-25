import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { TenantContextService } from '../../core/services/tenant-context.service';

interface Lead {
  id: string;
  tenantId: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  source?: string | null;
  status: string;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'won', 'lost'];

@Component({
  selector: 'mc-leads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="max-w-6xl mx-auto">
    <div class="flex items-start justify-between mb-8">
      <div>
        <span class="mc-eyebrow">Pipeline</span>
        <h1 class="mc-heading text-3xl font-bold mt-1">Leads</h1>
        <p class="text-fg-muted mt-1 text-sm">Visitor form submissions, organized by status. New leads land here automatically from any rendered tenant site.</p>
      </div>
      <select class="mc-input !w-auto !py-2" [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value); load()">
        <option value="">All statuses</option>
        @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
      </select>
    </div>

    @if (!tenantId()) {
      <div class="mc-card p-12 text-center text-fg-muted text-sm">
        Pick a tenant from the sidebar to see its leads.
      </div>
    } @else if (loading()) {
      <div class="mc-card p-8 text-center text-fg-muted">Loading…</div>
    } @else if (leads().length === 0) {
      <div class="mc-card p-12 text-center">
        <p class="text-fg-muted">No leads yet for this tenant.</p>
        <p class="text-xs text-fg-subtle mt-2">When a visitor submits a contact form on the published site, a lead lands here automatically.</p>
      </div>
    } @else {
      <div class="mc-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-white/[0.02] text-fg-subtle text-xs uppercase tracking-wider">
            <tr>
              <th class="text-left px-5 py-3 font-medium">Lead</th>
              <th class="text-left px-5 py-3 font-medium hidden md:table-cell">Source</th>
              <th class="text-left px-5 py-3 font-medium">Status</th>
              <th class="text-left px-5 py-3 font-medium hidden lg:table-cell">Captured</th>
            </tr>
          </thead>
          <tbody>
            @for (l of leads(); track l.id) {
              <tr class="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                <td class="px-5 py-3">
                  <div class="font-medium">{{ l.name || l.email || l.phone || '(unknown)' }}</div>
                  <div class="text-xs text-fg-subtle">
                    @if (l.email) { <span>{{ l.email }}</span> }
                    @if (l.email && l.phone) { <span> · </span> }
                    @if (l.phone) { <span>{{ l.phone }}</span> }
                  </div>
                </td>
                <td class="px-5 py-3 hidden md:table-cell text-xs text-fg-muted">{{ l.source ?? '—' }}</td>
                <td class="px-5 py-3">
                  <select class="mc-input !w-auto !py-1 text-xs"
                          [value]="l.status"
                          (change)="setStatus(l, $any($event.target).value)">
                    @for (s of statuses; track s) { <option [value]="s">{{ s }}</option> }
                  </select>
                </td>
                <td class="px-5 py-3 hidden lg:table-cell text-xs text-fg-muted">{{ l.createdAt | date:'MMM d, h:mm a' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>
  `,
})
export class LeadsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly tenantCtx = inject(TenantContextService);

  protected readonly statuses = STATUS_OPTIONS;
  protected readonly leads = signal<Lead[]>([]);
  protected readonly loading = signal(true);
  protected readonly statusFilter = signal<string>('');
  protected readonly tenantId = computed(() => this.tenantCtx.current()?.id ?? null);

  ngOnInit() { this.load(); }

  load() {
    const tid = this.tenantId();
    if (!tid) { this.loading.set(false); this.leads.set([]); return; }
    this.loading.set(true);
    this.api.get<Lead[]>('/leads', { tenantId: tid, status: this.statusFilter() || undefined }).subscribe({
      next: (rows) => { this.leads.set(rows); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Failed to load leads.'); },
    });
  }

  setStatus(lead: Lead, status: string) {
    const tid = this.tenantId(); if (!tid) return;
    const previousStatus = lead.status;
    this.api.patch<Lead>(`/leads/${lead.id}`, { status }, { tenantId: tid }).subscribe({
      next: (updated) => this.leads.set(this.leads().map((l) => (l.id === updated.id ? updated : l))),
      error: (e: Error) => {
        this.notify.error(e.message ?? 'Status update failed');
        this.leads.set(this.leads().map((l) => (l.id === lead.id ? { ...l, status: previousStatus } : l)));
      },
    });
  }
}
