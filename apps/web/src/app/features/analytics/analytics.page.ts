import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { TenantContextService } from '../../core/services/tenant-context.service';

interface Summary { since: string; views: number; conversions: number; aiGenerations: number; deployments: number; }
interface TimeseriesPoint { day: string; views: number; conversions: number; }
interface TopPage { path: string; views: number; conversions: number; conversionRate: number; }
interface Referrer { referrer: string; count: number; }

@Component({
  selector: 'mc-analytics',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="mb-8">
    <h1 class="mc-heading text-3xl font-bold">Analytics</h1>
    <p class="text-fg-muted mt-1">Last 28 days.</p>
  </div>

  @if (!tenant()) {
    <div class="mc-card p-8 text-center text-fg-muted">Pick a tenant first.</div>
  } @else if (loading()) {
    <div class="grid md:grid-cols-4 gap-4 mb-6">
      @for (_ of [1,2,3,4]; track _) {
        <div class="mc-card p-6">
          <div class="h-3 w-24 rounded bg-white/10 animate-pulse mb-3"></div>
          <div class="h-9 w-20 rounded bg-white/10 animate-pulse"></div>
        </div>
      }
    </div>
    <div class="mc-card p-6 mb-6">
      <div class="h-40 rounded bg-white/10 animate-pulse"></div>
    </div>
  } @else {
    <!-- Summary cards -->
    @if (summary(); as s) {
      <div class="grid md:grid-cols-4 gap-4 mb-6">
        <div class="mc-card p-6">
          <div class="text-xs text-fg-subtle uppercase tracking-wider mb-2">Page views</div>
          <div class="mc-heading text-3xl font-bold">{{ s.views }}</div>
        </div>
        <div class="mc-card p-6">
          <div class="text-xs text-fg-subtle uppercase tracking-wider mb-2">Conversions</div>
          <div class="mc-heading text-3xl font-bold">{{ s.conversions }}</div>
        </div>
        <div class="mc-card p-6">
          <div class="text-xs text-fg-subtle uppercase tracking-wider mb-2">AI generations</div>
          <div class="mc-heading text-3xl font-bold">{{ s.aiGenerations }}</div>
        </div>
        <div class="mc-card p-6">
          <div class="text-xs text-fg-subtle uppercase tracking-wider mb-2">Deployments</div>
          <div class="mc-heading text-3xl font-bold">{{ s.deployments }}</div>
        </div>
      </div>
    }

    <!-- Views chart (pure SVG area chart) -->
    <div class="mc-card p-6 mb-6">
      <h2 class="text-sm font-medium text-fg-muted mb-4">Views over time</h2>
      @if (timeseries().length > 0) {
        <div class="relative h-44">
          <svg class="w-full h-full" [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight" preserveAspectRatio="none">
            <!-- Area fill (brand red @ 15% alpha) -->
            <path [attr.d]="areaPath()" fill="rgba(231,76,60,0.15)" />
            <!-- Line (brand primary) -->
            <path [attr.d]="linePath()" fill="none" stroke="#E74C3C" stroke-width="2" vector-effect="non-scaling-stroke" />
            <!-- Conversions line (brand accent/secondary) -->
            <path [attr.d]="convLinePath()" fill="none" stroke="#27AE60" stroke-width="1.5" stroke-dasharray="4 2" vector-effect="non-scaling-stroke" />
          </svg>
          <div class="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-fg-subtle px-1">
            @if (timeseries().length > 1) {
              <span>{{ timeseries()[0].day | date:'MMM d' }}</span>
              <span>{{ timeseries()[timeseries().length - 1].day | date:'MMM d' }}</span>
            }
          </div>
        </div>
        <div class="flex gap-4 mt-2 text-xs text-fg-subtle">
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-[#E74C3C]"></span> Views</span>
          <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-[#27AE60]"></span> Conversions</span>
        </div>
      } @else {
        <div class="h-44 grid place-items-center text-fg-muted text-sm">No data yet.</div>
      }
    </div>

    <!-- Top pages & Referrers side by side -->
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Top pages -->
      <div class="mc-card overflow-hidden">
        <div class="px-5 py-3 bg-white/[0.02] text-xs font-medium text-fg-muted uppercase tracking-wider">Top pages</div>
        <table class="w-full text-sm">
          <thead class="text-xs text-fg-subtle">
            <tr>
              <th class="text-left px-5 py-2">Path</th>
              <th class="text-right px-5 py-2">Views</th>
              <th class="text-right px-5 py-2">Conv %</th>
            </tr>
          </thead>
          <tbody>
            @for (p of topPages(); track p.path) {
              <tr class="border-t border-white/5">
                <td class="px-5 py-2 font-mono text-xs truncate max-w-[200px]">{{ p.path }}</td>
                <td class="px-5 py-2 text-right text-xs">{{ p.views }}</td>
                <td class="px-5 py-2 text-right text-xs">{{ p.conversionRate }}%</td>
              </tr>
            }
            @if (topPages().length === 0) {
              <tr><td colspan="3" class="px-5 py-4 text-center text-fg-muted text-xs">No page data.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Referrers -->
      <div class="mc-card overflow-hidden">
        <div class="px-5 py-3 bg-white/[0.02] text-xs font-medium text-fg-muted uppercase tracking-wider">Referrers</div>
        <table class="w-full text-sm">
          <thead class="text-xs text-fg-subtle">
            <tr>
              <th class="text-left px-5 py-2">Source</th>
              <th class="text-right px-5 py-2">Hits</th>
            </tr>
          </thead>
          <tbody>
            @for (r of referrers(); track r.referrer) {
              <tr class="border-t border-white/5">
                <td class="px-5 py-2 text-xs truncate max-w-[250px]">{{ r.referrer }}</td>
                <td class="px-5 py-2 text-right text-xs">{{ r.count }}</td>
              </tr>
            }
            @if (referrers().length === 0) {
              <tr><td colspan="2" class="px-5 py-4 text-center text-fg-muted text-xs">No referrer data.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  }
  `,
})
export class AnalyticsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly tenantCtx = inject(TenantContextService);
  protected readonly tenant = this.tenantCtx.current;
  protected readonly summary = signal<Summary | null>(null);
  protected readonly timeseries = signal<TimeseriesPoint[]>([]);
  protected readonly topPages = signal<TopPage[]>([]);
  protected readonly referrers = signal<Referrer[]>([]);
  protected readonly loading = signal(true);

  protected readonly chartWidth = 600;
  protected readonly chartHeight = 160;

  ngOnInit() {
    const t = this.tenant(); if (!t) { this.loading.set(false); return; }
    const params = { tenantId: t.id, days: 28 };

    this.api.get<Summary>('/analytics/summary', params).subscribe({
      next: (s) => { this.summary.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.api.get<TimeseriesPoint[]>('/analytics/timeseries', params).subscribe({
      next: (d) => this.timeseries.set(d),
      error: () => { this.timeseries.set([]); this.notify.error('Failed to load traffic chart data.'); },
    });

    this.api.get<TopPage[]>('/analytics/top-pages', params).subscribe({
      next: (d) => this.topPages.set(d),
      error: () => { this.topPages.set([]); this.notify.error('Failed to load top pages.'); },
    });

    this.api.get<Referrer[]>('/analytics/referrers', params).subscribe({
      next: (d) => this.referrers.set(d),
      error: () => { this.referrers.set([]); this.notify.error('Failed to load referrer data.'); },
    });
  }

  private toPoints(field: 'views' | 'conversions'): string[] {
    const data = this.timeseries();
    if (!data.length) return [];
    const max = Math.max(1, ...data.map((d) => d[field]));
    const stepX = this.chartWidth / Math.max(1, data.length - 1);
    return data.map((d, i) => `${i * stepX},${this.chartHeight - (d[field] / max) * this.chartHeight}`);
  }

  protected linePath(): string {
    const pts = this.toPoints('views');
    return pts.length ? 'M' + pts.join(' L') : '';
  }

  protected areaPath(): string {
    const pts = this.toPoints('views');
    if (!pts.length) return '';
    return `M0,${this.chartHeight} L${pts.join(' L')} L${this.chartWidth},${this.chartHeight} Z`;
  }

  protected convLinePath(): string {
    const pts = this.toPoints('conversions');
    return pts.length ? 'M' + pts.join(' L') : '';
  }
}
