import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { NotificationService } from '../../core/services/notification.service';

interface Domain { id: string; hostname: string; type: string; status: string; isPrimary: boolean; sslStatus?: string | null; lastError?: string | null; }

interface DnsRecord { recordType: string; name: string; value: string; ttl?: number; }

interface DnsInstructionsResponse { hostname: string; records: DnsRecord[]; }

@Component({
  selector: 'mc-domains',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="mc-heading text-3xl font-bold">Domains</h1>
      <p class="text-fg-muted mt-1">Attach a custom domain to this tenant.</p>
    </div>
  </div>

  @if (!tenant()) {
    <div class="mc-card p-8 text-center text-fg-muted">Pick a tenant first.</div>
  } @else {
    <div class="mc-card p-5 mb-6">
      <div class="grid md:grid-cols-[1fr_180px_auto] gap-3">
        <input class="mc-input" placeholder="www.yourdomain.com" [(ngModel)]="hostname" />
        <select class="mc-input" [(ngModel)]="type">
          <option value="CNAME">CNAME (subdomain)</option>
          <option value="APEX">APEX (root)</option>
          <option value="SUBDOMAIN">SUBDOMAIN (madcreate)</option>
          <option value="WILDCARD">WILDCARD</option>
        </select>
        <button class="mc-btn-primary" (click)="add()" [disabled]="!hostname().trim()">Add</button>
      </div>
      @if (error()) { <div class="text-sm text-danger mt-3">{{ error() }}</div> }
    </div>

    @if (items().length > 0) {
      <div class="mc-card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-white/[0.02] text-xs uppercase tracking-wider text-fg-subtle">
            <tr>
              <th class="text-left px-5 py-3">Hostname</th>
              <th class="text-left px-5 py-3">Type</th>
              <th class="text-left px-5 py-3">Status</th>
              <th class="text-left px-5 py-3">SSL</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            @for (d of items(); track d.id) {
              <tr class="border-t border-white/5">
                <td class="px-5 py-3 font-mono text-xs">{{ d.hostname }}</td>
                <td class="px-5 py-3 text-xs">{{ d.type }}</td>
                <td class="px-5 py-3"><span class="mc-chip">{{ d.status }}</span></td>
                <td class="px-5 py-3 text-xs text-fg-muted">{{ d.sslStatus ?? '—' }}</td>
                <td class="px-5 py-3 text-right space-x-2">
                  <button class="mc-btn-ghost text-xs" (click)="showInstructions(d)">Setup</button>
                  <button class="mc-btn-secondary text-xs" (click)="verify(d)">Verify</button>
                  <button class="mc-btn-ghost text-xs text-danger" (click)="remove(d)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (instructions(); as inst) {
      <div class="mc-card p-5 mt-6">
        <h3 class="mc-heading font-semibold mb-3">DNS records for {{ inst.hostname }}</h3>
        <table class="w-full text-xs font-mono">
          <thead class="text-fg-subtle uppercase tracking-wider">
            <tr><th class="text-left py-2">Type</th><th class="text-left py-2">Name</th><th class="text-left py-2">Value</th><th class="text-left py-2">TTL</th></tr>
          </thead>
          <tbody>
            @for (r of inst.records; track r.name) {
              <tr class="border-t border-white/5">
                <td class="py-2">{{ r.recordType }}</td>
                <td class="py-2">{{ r.name }}</td>
                <td class="py-2 break-all">
                  <span class="inline-flex items-center gap-1.5">
                    {{ r.value }}
                    <button class="mc-btn-ghost text-[10px] px-1.5 py-0.5 shrink-0" (click)="copyValue(r.value)">Copy</button>
                  </span>
                </td>
                <td class="py-2">{{ r.ttl ?? 300 }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  }
  `,
})
export class DomainsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly notify = inject(NotificationService);
  protected readonly tenant = this.tenantCtx.current;

  protected readonly items = signal<Domain[]>([]);
  protected readonly hostname = signal('');
  protected readonly type = signal<'CNAME' | 'APEX' | 'SUBDOMAIN' | 'WILDCARD'>('CNAME');
  protected readonly error = signal<string | null>(null);
  protected readonly instructions = signal<DnsInstructionsResponse | null>(null);

  ngOnInit() { this.refresh(); }

  refresh() {
    const t = this.tenant(); if (!t) return;
    this.api.get<Domain[]>('/domains', { tenantId: t.id }).subscribe({ next: (d) => this.items.set(d), error: (e: Error) => this.notify.error(e.message ?? 'Failed to load domains') });
  }

  add() {
    const t = this.tenant(); if (!t) return;
    this.error.set(null);
    this.api.post('/domains', { hostname: this.hostname(), type: this.type() }, { tenantId: t.id }).subscribe({
      next: () => {
        this.hostname.set('');
        this.refresh();
        this.notify.success('Domain added.');
      },
      error: (e) => {
        this.error.set(e.message);
        this.notify.error(e.message ?? 'Something went wrong');
      },
    });
  }

  verify(d: Domain) {
    this.api.post(`/domains/${d.id}/verify`).subscribe({
      next: () => { this.refresh(); this.notify.success('Domain verification started.'); },
      error: (e: Error) => this.notify.error(e.message ?? 'Something went wrong'),
    });
  }

  async copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.notify.success('Copied');
    } catch {
      this.notify.error('Copy failed — try selecting manually');
    }
  }

  remove(d: Domain) {
    this.notify.confirm(
      `Delete domain "${d.hostname}"?`,
      'This domain will be permanently removed. This cannot be undone.',
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/domains/${d.id}`).subscribe({
        next: () => {
          this.refresh();
          this.notify.success(`Deleted "${d.hostname}".`);
        },
        error: (e: Error) => this.notify.error(e.message ?? 'Failed to delete domain'),
      });
    });
  }

  showInstructions(d: Domain) {
    this.api.get<DnsInstructionsResponse>(`/domains/${d.id}/instructions`)
      .subscribe({ next: (i) => this.instructions.set(i), error: (e: Error) => this.notify.error(e.message ?? 'Failed to load DNS instructions') });
  }
}
