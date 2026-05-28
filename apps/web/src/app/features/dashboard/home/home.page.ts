import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface Tenant { id: string; slug: string; name: string; status: string; industry?: string | null; }

@Component({
  selector: 'mc-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div>
    <div class="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 class="mc-heading text-3xl font-bold">Welcome back, {{ greeting() }}.</h1>
        <p class="text-fg-muted mt-1">Your workspace at a glance.</p>
      </div>
      <a routerLink="/app/onboarding" class="mc-btn-primary">
        <i class="fa-solid fa-plus"></i> New tenant
      </a>
    </div>

    <!-- Pending plan checkout nudge — shows when user signed up from pricing page. -->
    @if (pendingPlan(); as plan) {
      <div class="mc-card p-5 mb-8 border border-brand/30 flex items-center gap-4">
        <div class="text-2xl"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold">Complete checkout: {{ plan }}</div>
          <div class="text-xs text-fg-muted">You selected the <span class="text-fg">{{ plan }}</span> plan during signup. Ready to activate it?</div>
        </div>
        <a routerLink="/app/settings" [queryParams]="{ tab: 'billing', plan: plan }" class="mc-btn-primary text-sm">Go to billing →</a>
        <button class="mc-btn-ghost text-xs text-danger" (click)="dismissPlan()" title="Dismiss"><i class="fa-solid fa-xmark"></i></button>
      </div>
    }

    <!-- Resume draft banner — only shows if onboarding.page wrote a draft to localStorage. -->
    @if (draft(); as d) {
      <div class="mc-card p-5 mb-8 border border-brand/30 flex items-center gap-4">
        <div class="text-2xl"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold">Resume your onboarding</div>
          <div class="text-xs text-fg-muted">
            You started <span class="text-fg">{{ d.companyName || 'a draft' }}</span>
            — picked up at step {{ d.step + 1 }} of 6.
            Last edited {{ d.savedAt | date:'MMM d, h:mm a' }}.
          </div>
        </div>
        <a routerLink="/app/onboarding" class="mc-btn-secondary text-sm">Continue →</a>
        <button class="mc-btn-ghost text-xs text-danger" (click)="discardDraft()" title="Discard the saved draft"><i class="fa-solid fa-xmark"></i></button>
      </div>
    }

    <!-- Stat strip -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      @for (stat of stats(); track stat.label) {
        <div class="mc-card p-5">
          <div class="text-xs text-fg-subtle uppercase tracking-wider mb-2">{{ stat.label }}</div>
          @if (statsLoading()) {
            <!-- Skeleton bar — same height as the rendered number so the card doesn't jitter. -->
            <div class="h-8 w-16 rounded bg-white/10 animate-pulse"></div>
          } @else {
            <div class="mc-heading text-2xl font-bold">{{ stat.value }}</div>
            @if (stat.hint) {
              <div class="text-[10px] text-fg-subtle mt-1">{{ stat.hint }}</div>
            }
          }
        </div>
      }
    </div>

    <!-- Tenants -->
    <div class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <h2 class="mc-heading text-xl font-semibold">Your tenants</h2>
        <a routerLink="/app/tenants" class="text-sm text-brand hover:underline">View all →</a>
      </div>

      @if (loading()) {
        <div class="grid md:grid-cols-3 gap-4">
          @for (_ of [1,2,3]; track _) {
            <div class="mc-card p-5 h-32 animate-pulse"></div>
          }
        </div>
      } @else if (tenants().length === 0) {
        <div class="mc-card p-8 text-center">
          <p class="text-fg-muted mb-4">No tenants yet — your first one is one wizard away.</p>
          <a routerLink="/app/onboarding" class="mc-btn-primary">Start onboarding</a>
        </div>
      } @else {
        <div class="grid md:grid-cols-3 gap-4">
          @for (t of tenants(); track t.id) {
            <a [routerLink]="['/app/tenants', t.id]" class="mc-card-hover p-5 group">
              <div class="flex items-start justify-between">
                <div>
                  <div class="mc-heading font-semibold group-hover:text-brand transition-colors">{{ t.name }}</div>
                  <div class="text-xs text-fg-subtle mt-0.5">/{{ t.slug }}</div>
                </div>
                <span class="mc-chip text-[10px]">{{ t.status }}</span>
              </div>
              @if (t.industry) {
                <div class="text-xs text-fg-muted mt-3">{{ t.industry }}</div>
              }
            </a>
          }
        </div>
      }
    </div>

    <!-- Quick actions -->
    <div>
      <h2 class="mc-heading text-xl font-semibold mb-4">Quick actions</h2>
      <div class="grid md:grid-cols-3 gap-4">
        @for (a of actions; track a.label) {
          <a [routerLink]="a.href" [queryParams]="a.queryParams" class="mc-card-hover p-5 flex items-center gap-4 group">
            <div class="w-10 h-10 rounded-md bg-brand/10 grid place-items-center text-brand"><i [class]="a.icon"></i></div>
            <div>
              <div class="font-medium group-hover:text-brand transition-colors">{{ a.label }}</div>
              <div class="text-xs text-fg-subtle">{{ a.body }}</div>
            </div>
          </a>
        }
      </div>
    </div>

    <!-- Functionality map -->
    <div class="mt-10">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="mc-heading text-xl font-semibold">Command Center</h2>
          <p class="text-sm text-fg-muted mt-1">Every major MADCreate capability, grouped by workflow.</p>
        </div>
      </div>
      <div class="grid lg:grid-cols-3 gap-4">
        @for (group of visibleCommandGroups(); track group.title) {
          <section class="mc-card p-5">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 rounded-md bg-brand/10 grid place-items-center text-brand">
                <i [class]="group.icon"></i>
              </div>
              <h3 class="mc-heading font-semibold">{{ group.title }}</h3>
            </div>
            <div class="grid gap-2">
              @for (tool of group.items; track tool.label) {
                <a [routerLink]="tool.href"
                   [queryParams]="tool.queryParams"
                   class="flex items-center justify-between gap-3 rounded-md border border-white/5 px-3 py-2 text-sm hover:border-brand/40 hover:bg-white/[0.03] transition-colors group">
                  <span class="min-w-0">
                    <span class="block font-medium group-hover:text-brand">{{ tool.label }}</span>
                    <span class="block text-xs text-fg-subtle truncate">{{ tool.body }}</span>
                  </span>
                  <i class="fa-solid fa-arrow-right text-xs text-fg-subtle group-hover:text-brand"></i>
                </a>
              }
            </div>
          </section>
        }
      </div>
    </div>
  </div>
  `,
})
export class HomePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly loading = signal(true);
  protected readonly pendingPlan = signal<string | null>(null);
  /** Onboarding draft restored from localStorage (set by onboarding.page). */
  protected readonly draft = signal<{ savedAt: string; step: number; companyName: string } | null>(null);

  protected readonly statsLoading = signal(true);
  protected readonly stats = signal<Array<{ label: string; value: string; hint?: string }>>([
    { label: 'Tenants', value: '0' },
    { label: 'Sites',   value: '0' },
    { label: 'MADCloud', value: '0', hint: 'last 30 days' },
    { label: 'Deploys', value: '0', hint: 'last 30 days' },
  ]);

  protected readonly isSuperAdmin = this.auth.isSuperAdmin;

  protected readonly actions: Array<{ icon: string; label: string; href: string; body: string; queryParams?: Record<string, string> }> = [
    { icon: 'fa-solid fa-wand-magic-sparkles', label: 'Generate a site', href: '/app/onboarding', body: 'AI wizard, end to end' },
    { icon: 'fa-solid fa-globe', label: 'Connect a domain', href: '/app/domains', body: 'CNAME or apex' },
    { icon: 'fa-solid fa-chart-simple', label: 'Open Growth Hub', href: '/app/growth', body: 'Launch, health, experiments' },
    { icon: 'fa-solid fa-arrow-up', label: 'Deploy', href: '/app/deployments', body: 'Internal, FTP, or webhook' },
    { icon: 'fa-solid fa-credit-card', label: 'Billing', href: '/app/settings', body: 'Payfast subscription', queryParams: { tab: 'billing' } },
    { icon: 'fa-solid fa-rectangle-list', label: 'Forms & Leads', href: '/app/leads', body: 'Lead capture inbox' },
  ];

  protected readonly commandGroups: Array<{
    title: string;
    icon: string;
    items: Array<{ label: string; href: string; body: string; queryParams?: Record<string, string>; adminOnly?: boolean }>;
  }> = [
    {
      title: 'Create',
      icon: 'fa-solid fa-wand-magic-sparkles',
      items: [
        { label: 'Generate site', href: '/app/onboarding', body: 'Create a tenant and MADCloud site draft' },
        { label: 'Manage tenants', href: '/app/tenants', body: 'Clients, slugs, sites, and domains' },
        { label: 'Template marketplace', href: '/app/marketplace', body: 'Reusable starting points' },
      ],
    },
    {
      title: 'Build',
      icon: 'fa-solid fa-screwdriver-wrench',
      items: [
        { label: 'Edit sites', href: '/app/sites', body: 'Open site detail and page builder' },
        { label: 'Themes', href: '/app/themes', body: 'Brand, colors, typography' },
        { label: 'Media', href: '/app/media', body: 'Images and assets' },
      ],
    },
    {
      title: 'Publish',
      icon: 'fa-solid fa-rocket',
      items: [
        { label: 'Domains', href: '/app/domains', body: 'DNS, SSL, and platform hostnames' },
        { label: 'Deployments', href: '/app/deployments', body: 'Release history and deploy now' },
        { label: 'Integrations', href: '/app/integrations', body: 'Payfast, MADCloud, and approved apps' },
      ],
    },
    {
      title: 'Grow',
      icon: 'fa-solid fa-chart-line',
      items: [
        { label: 'Forms & Leads', href: '/app/leads', body: 'Captured submissions and statuses' },
        { label: 'Analytics', href: '/app/analytics', body: 'Traffic and conversion signals' },
        { label: 'Growth Hub', href: '/app/growth', body: 'Launch readiness and optimization' },
      ],
    },
    {
      title: 'Operate',
      icon: 'fa-solid fa-gear',
      items: [
        { label: 'Billing', href: '/app/settings', body: 'Payfast subscription management', queryParams: { tab: 'billing' } },
        { label: 'Settings', href: '/app/settings', body: 'Workspace, profile, and preferences' },
      ],
    },
    {
      title: 'Admin',
      icon: 'fa-solid fa-shield-halved',
      items: [
        { label: 'MADCloud', href: '/app/ai', body: 'Task queue and prompt operations', adminOnly: true },
        { label: 'Super Admin', href: '/app/admin', body: 'Platform diagnostics and controls', adminOnly: true },
      ],
    },
  ];

  protected visibleCommandGroups() {
    const isAdmin = this.isSuperAdmin();
    return this.commandGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => !item.adminOnly || isAdmin) }))
      .filter((group) => group.items.length > 0);
  }

  ngOnInit() {
    // Pending plan from pricing → register flow.
    try {
      const plan = sessionStorage.getItem('mc.pending-plan');
      if (plan) this.pendingPlan.set(plan);
    } catch { /* ignore */ }

    // Onboarding draft sniff — see onboarding.page.ts persistToLocalStorage().
    try {
      const ws0 = this.auth.currentWorkspace();
      const key = `mc.onboarding.draft.${ws0?.workspaceId ?? 'anon'}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const payload = JSON.parse(raw);
        if (payload?.form) {
          this.draft.set({
            savedAt: payload.savedAt ?? new Date().toISOString(),
            step: typeof payload.step === 'number' ? payload.step : 0,
            companyName: payload.form.companyName ?? '',
          });
        }
      }
    } catch { /* malformed or unavailable — no banner */ }

    const ws = this.auth.currentWorkspace();
    if (!ws) { this.loading.set(false); this.statsLoading.set(false); return; }

    // Tenants list (drives the cards below).
    this.api.get<Tenant[]>('/tenants', { workspaceId: ws.workspaceId }).subscribe({
      next: (t) => { this.tenants.set(t); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Failed to load tenants.'); },
    });

    // Real stats — runs in parallel with the tenant list.
    this.api.get<{ tenants: number; sites: number; generations: number; deployments: number }>(
      `/workspaces/${ws.workspaceId}/stats`,
    ).subscribe({
      next: (s) => {
        this.stats.set([
          { label: 'Tenants', value: String(s.tenants) },
          { label: 'Sites',   value: String(s.sites) },
          { label: 'MADCloud', value: String(s.generations), hint: 'last 30 days' },
          { label: 'Deploys', value: String(s.deployments), hint: 'last 30 days' },
        ]);
        this.statsLoading.set(false);
      },
      error: () => { this.statsLoading.set(false); this.notify.error('Failed to load workspace stats.'); },
    });
  }

  protected greeting(): string {
    const u = this.auth.user();
    return u?.firstName || u?.email?.split('@')[0] || 'there';
  }

  protected dismissPlan() {
    try { sessionStorage.removeItem('mc.pending-plan'); } catch { /* */ }
    this.pendingPlan.set(null);
  }

  protected discardDraft() {
    try {
      const ws = this.auth.currentWorkspace();
      localStorage.removeItem(`mc.onboarding.draft.${ws?.workspaceId ?? 'anon'}`);
    } catch { /* */ }
    this.draft.set(null);
  }
}
