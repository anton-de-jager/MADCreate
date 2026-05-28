import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { NotificationService } from '../../core/services/notification.service';

interface Deployment { id: string; target: string; status: string; createdAt: string; startedAt?: string | null; finishedAt?: string | null; durationMs?: number | null; log?: string | null; artefactUrl?: string | null; }

const TARGETS = ['INTERNAL', 'STATIC_EXPORT', 'FTP', 'SFTP', 'CLOUDFLARE_PAGES', 'VERCEL', 'CUSTOM_WEBHOOK', 'DOCKER', 'DIGITAL_OCEAN'];

@Component({
  selector: 'mc-deployments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="mc-heading text-3xl font-bold">Deployments</h1>
      <p class="text-fg-muted mt-1">Every release for this tenant.</p>
    </div>
    <div class="flex items-center gap-2">
      <select class="mc-input !w-auto !py-2" [(ngModel)]="target">
        @for (t of targets; track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <button class="mc-btn-primary" (click)="trigger()"><i class="fa-solid fa-arrow-up"></i> Deploy now</button>
    </div>
  </div>

  @if (!tenant()) {
    <div class="mc-card p-8 text-center">
      <p class="text-fg-muted mb-3">Pick a tenant first.</p>
      <a routerLink="/app/tenants" class="mc-btn-primary">Go to tenants</a>
    </div>
  } @else if (loading()) {
    <!-- Skeleton rows mirror the deployment list. Only shown on the first
         fetch - subsequent SSE-triggered refreshes re-use the existing items. -->
    <div class="space-y-3">
      @for (_ of [1,2,3]; track _) {
        <div class="mc-card p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="h-5 w-20 rounded bg-white/10 animate-pulse"></div>
              <div class="h-4 w-16 rounded bg-white/10 animate-pulse"></div>
              <div class="h-3 w-14 rounded bg-white/10 animate-pulse"></div>
            </div>
            <div class="h-3 w-12 rounded bg-white/10 animate-pulse"></div>
          </div>
        </div>
      }
    </div>
  } @else if (items().length === 0) {
    <div class="mc-card p-8 text-center">
      <p class="text-fg-muted mb-3">No deployments yet.</p>
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button class="mc-btn-primary" (click)="trigger()"><i class="fa-solid fa-arrow-up"></i> Deploy now</button>
        <a routerLink="/app/domains" class="mc-btn-secondary">Connect domain</a>
        <a routerLink="/app/sites" class="mc-btn-ghost">Review site</a>
      </div>
    </div>
  } @else {
    <div class="space-y-3">
      @for (d of items(); track d.id) {
        <div class="mc-card p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="mc-chip">{{ d.target }}</span>
              <span class="text-xs"
                    [class.text-success]="d.status === 'SUCCESS'"
                    [class.text-warning]="d.status === 'PENDING' || d.status === 'RUNNING'"
                    [class.text-danger]="d.status === 'FAILED'">
                {{ d.status }}
              </span>
              <span class="text-xs text-fg-subtle font-mono">{{ d.id.slice(0, 8) }}</span>
            </div>
            <span class="text-xs text-fg-subtle">{{ d.durationMs ? d.durationMs + 'ms' : '-' }}</span>
          </div>
          @if (d.log) {
            <pre class="mt-3 text-xs bg-surface-subtle p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">{{ d.log }}</pre>
          }
        </div>
      }
    </div>
  }
  `,
})
export class DeploymentsPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly notify = inject(NotificationService);
  private readonly zone = inject(NgZone);
  protected readonly tenant = this.tenantCtx.current;
  protected readonly targets = TARGETS;
  protected readonly target = signal<string>('INTERNAL');
  protected readonly items = signal<Deployment[]>([]);
  protected readonly loading = signal(true);
  private readonly destroy$ = new Subject<void>();
  private eventSource: EventSource | null = null;

  ngOnInit() {
    this.refresh();
    this.connectSSE();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.eventSource?.close();
    this.eventSource = null;
  }

  private connectSSE() {
    this.zone.runOutsideAngular(() => {
      const raw = localStorage.getItem('mc.auth.v1');
      const token = raw ? (JSON.parse(raw) as { accessToken?: string }).accessToken ?? '' : '';
      const es = new EventSource(`${this.api.base}/deployments/events?token=${encodeURIComponent(token)}`);
      es.onmessage = () => this.zone.run(() => this.refresh());
      es.onerror = () => {
        // Browser will auto-reconnect; nothing extra needed.
      };
      this.eventSource = es;
    });
  }

  refresh() {
    const t = this.tenant(); if (!t) { this.loading.set(false); return; }
    this.api.get<Deployment[]>('/deployments', { tenantId: t.id }).subscribe({
      next: (d) => {
        this.items.set(d);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.notify.error('Failed to load deployments.'); },
    });
  }

  trigger() {
    const t = this.tenant(); if (!t) return;
    this.api.post('/deployments', { target: this.target() }, { tenantId: t.id }).subscribe({
      next: () => { this.refresh(); this.notify.success('Deployment queued.'); },
      error: (e: Error) => this.notify.error(e.message ?? 'Something went wrong'),
    });
  }
}
