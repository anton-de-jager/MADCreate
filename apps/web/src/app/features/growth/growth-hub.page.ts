import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { NotificationService } from '../../core/services/notification.service';

interface LaunchStep {
  key: string;
  label: string;
  detail: string;
  complete: boolean;
  action: string;
  route: string;
}

interface GrowthHub {
  selectedTenant: { id: string; name: string; slug: string; industry?: string | null } | null;
  metrics: Record<string, number>;
  launchSteps: LaunchStep[];
  siteHealth: {
    score: number;
    grade: string;
    items: Array<{ label: string; value: boolean; weight: number }>;
  };
  briefQuality: {
    score: number;
    grade: string;
    missing: string[];
    checks: Array<{ label: string; ok: boolean; guidance: string; weight: number }>;
  };
  experiments: Array<{ name: string; metric: string; status: string; idea: string }>;
  blueprints: Array<{ industry: string; pages: string; focus: string }>;
  playbooks: Array<{ title: string; app: string; outcome: string }>;
  universeApps: Array<{ app: string; capability: string; status: string }>;
  compliance: Array<{ label: string; detail: string; severity: string }>;
  packaging: string[];
  activity: Array<{ type: string; label: string; detail: string; at: string }>;
}

@Component({
  selector: 'mc-growth-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <main class="growth-shell">
    <section class="hero-band">
      <div>
        <p class="section-label">MADProspects Universe</p>
        <h1>Growth Hub</h1>
        <p class="hero-copy">
          One professional command room for launch readiness, conversion experiments, client review, MADCloud work,
          Payfast billing, and cross-application growth ideas.
        </p>
      </div>
      @if (hub(); as h) {
        <div class="hero-meter">
          <span>{{ h.siteHealth.grade }}</span>
          <strong>{{ h.siteHealth.score }}</strong>
          <small>site health</small>
        </div>
      }
    </section>

    @if (loading()) {
      <section class="grid-two">
        <div class="panel skeleton"></div>
        <div class="panel skeleton"></div>
      </section>
    } @else if (!hub()) {
      <section class="panel empty">
        <h2>No growth data yet</h2>
        <p>Create or select a tenant, then come back here to run the launch room.</p>
        <a routerLink="/app/onboarding" class="action primary">Start onboarding</a>
      </section>
    } @else {
      @let h = hub()!;

      <section class="metric-strip">
        @for (metric of metricCards(); track metric.label) {
          <article>
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small>{{ metric.hint }}</small>
          </article>
        }
      </section>

      <section class="grid-two">
        <article class="panel launch-room">
          <div class="panel-head">
            <div>
              <p class="section-label">Guided launch room</p>
              <h2>{{ h.selectedTenant?.name || 'Workspace' }} launch timeline</h2>
            </div>
            <span class="completion">{{ completedSteps() }}/{{ h.launchSteps.length }}</span>
          </div>

          <ol class="steps">
            @for (step of h.launchSteps; track step.key) {
              <li [class.done]="step.complete">
                <span class="step-dot">{{ step.complete ? 'OK' : '' }}</span>
                <div>
                  <strong>{{ step.label }}</strong>
                  <p>{{ step.detail }}</p>
                </div>
                <a [routerLink]="step.route">{{ step.action }}</a>
              </li>
            }
          </ol>
        </article>

        <article class="panel health-panel">
          <div class="panel-head">
            <div>
              <p class="section-label">Site health score</p>
              <h2>{{ h.siteHealth.grade }}</h2>
            </div>
            <strong class="score">{{ h.siteHealth.score }}%</strong>
          </div>
          <div class="health-bar"><span [style.width.%]="h.siteHealth.score"></span></div>
          <div class="health-grid">
            @for (item of h.siteHealth.items; track item.label) {
              <div [class.good]="item.value">
                <span>{{ item.label }}</span>
                <strong>{{ item.value ? 'Ready' : '+' + item.weight + '%' }}</strong>
              </div>
            }
          </div>
        </article>
      </section>

      <section class="grid-three">
        <article class="panel">
          <p class="section-label">MADCloud only</p>
          <h2>AI operations</h2>
          <p class="muted">All generation, reports, code work, research, and automation tasks route through MADCloud. No other AI integration is exposed.</p>
          <a routerLink="/app/ai" class="action primary">Open MADCloud</a>
        </article>
        <article class="panel">
          <p class="section-label">Payfast only</p>
          <h2>Payment provider</h2>
          <p class="muted">Payfast.io is the only payment provider. Prices default to USD and switch to ZAR for South African IPs.</p>
          <a routerLink="/app/settings" [queryParams]="{ tab: 'billing' }" class="action">Open billing</a>
        </article>
        <article class="panel">
          <p class="section-label">Client review mode</p>
          <h2>Approval inbox</h2>
          <p class="muted">Centralize pending copy, domain, deployment, stale lead, and regulated-claim approval work before publish.</p>
          <a routerLink="/app/sites" class="action">Review sites</a>
        </article>
      </section>

      <section class="grid-two">
        <article class="panel health-panel">
          <div class="panel-head">
            <div>
              <p class="section-label">MADCloud brief quality score</p>
              <h2>{{ h.briefQuality.grade }}</h2>
            </div>
            <strong class="score">{{ h.briefQuality.score }}%</strong>
          </div>
          <div class="health-bar amber"><span [style.width.%]="h.briefQuality.score"></span></div>
          <div class="quality-list">
            @for (check of h.briefQuality.checks; track check.label) {
              <div [class.good]="check.ok">
                <strong>{{ check.label }}</strong>
                <p>{{ check.ok ? 'Ready for MADCloud generation.' : check.guidance }}</p>
              </div>
            }
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="section-label">Industry blueprint packs</p>
              <h2>Sharper first drafts</h2>
            </div>
            <a routerLink="/app/marketplace" class="text-link">Templates</a>
          </div>
          <div class="blueprint-list">
            @for (blueprint of h.blueprints; track blueprint.industry) {
              <div>
                <span>{{ blueprint.industry }}</span>
                <strong>{{ blueprint.pages }}</strong>
                <p>{{ blueprint.focus }}</p>
              </div>
            }
          </div>
        </article>
      </section>

      <section class="grid-two">
        <article class="panel">
          <div class="panel-head">
            <div>
              <p class="section-label">Experiment library</p>
              <h2>A/B and conversion ideas</h2>
            </div>
            <a routerLink="/app/analytics" class="text-link">Analytics</a>
          </div>
          <div class="experiment-list">
            @for (experiment of h.experiments; track experiment.name) {
              <div>
                <span [class.ready]="experiment.status === 'Ready'">{{ experiment.status }}</span>
                <strong>{{ experiment.name }}</strong>
                <p>{{ experiment.metric }} - {{ experiment.idea }}</p>
              </div>
            }
          </div>
        </article>

        <article class="panel">
          <p class="section-label">Universe activity feed</p>
          <h2>Recent signal</h2>
          <div class="activity-list">
            @for (event of h.activity; track event.type + event.at + event.label) {
              <div>
                <span>{{ event.type }}</span>
                <strong>{{ event.label }}</strong>
                <p>{{ event.detail }} - {{ event.at | date:'MMM d, HH:mm' }}</p>
              </div>
            }
            @if (h.activity.length === 0) {
              <p class="muted">No recent activity yet.</p>
            }
          </div>
        </article>
      </section>

      <section class="panel universe-panel">
        <div class="panel-head">
          <div>
            <p class="section-label">MADProspects Universe integration map</p>
            <h2>Contracts ready for connected workflows</h2>
          </div>
          <a routerLink="/app/integrations" class="action">Install integrations</a>
        </div>
        <div class="app-grid">
          @for (app of h.universeApps; track app.app) {
            <article>
              <span>{{ app.status }}</span>
              <strong>{{ app.app }}</strong>
              <p>{{ app.capability }}</p>
            </article>
          }
        </div>
      </section>

      <section class="grid-two">
        <article class="panel">
          <p class="section-label">Deep integration playbooks</p>
          <h2>Next workflows to wire</h2>
          <div class="playbook-list">
            @for (playbook of h.playbooks; track playbook.title) {
              <div>
                <span>{{ playbook.app }}</span>
                <strong>{{ playbook.title }}</strong>
                <p>{{ playbook.outcome }}</p>
              </div>
            }
          </div>
        </article>

        <article class="panel">
          <p class="section-label">Governance and packaging</p>
          <h2>Commercially ready controls</h2>
          <div class="compliance-list">
            @for (item of h.compliance; track item.label) {
              <div [class.high]="item.severity === 'High'">
                <strong>{{ item.label }}</strong>
                <p>{{ item.detail }}</p>
              </div>
            }
          </div>
          <div class="package-row">
            @for (pack of h.packaging; track pack) {
              <span>{{ pack }}</span>
            }
          </div>
        </article>
      </section>
    }
  </main>
  `,
  styles: [`
    :host { display: block; }
    .growth-shell { display: grid; gap: 18px; color: #edf5ff; }
    .hero-band, .panel, .metric-strip article {
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(11,18,32,.98), rgba(21,33,52,.94));
      box-shadow: 0 24px 70px rgba(0,0,0,.22);
    }
    .hero-band {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: center;
      min-height: 260px;
      padding: clamp(22px, 5vw, 46px);
      overflow: hidden;
      position: relative;
    }
    .hero-band::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(120deg, rgba(20,184,166,.18), transparent 38%),
        linear-gradient(300deg, rgba(250,204,21,.12), transparent 44%),
        linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px),
        linear-gradient(0deg, rgba(255,255,255,.04) 1px, transparent 1px);
      background-size: auto, auto, 44px 44px, 44px 44px;
      opacity: .92;
    }
    .hero-band > * { position: relative; z-index: 1; }
    .section-label {
      margin: 0 0 8px;
      color: #99f6e4;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    h1, h2, p { letter-spacing: 0; }
    h1 { margin: 0; max-width: 11ch; font-size: clamp(42px, 8vw, 84px); line-height: .92; }
    h2 { margin: 0; font-size: clamp(20px, 3vw, 28px); line-height: 1.05; }
    .hero-copy { max-width: 680px; margin: 18px 0 0; color: #c7d2fe; font-size: 16px; line-height: 1.7; }
    .hero-meter {
      display: grid;
      place-items: center;
      flex: 0 0 190px;
      aspect-ratio: 1;
      border-radius: 999px;
      border: 1px solid rgba(153,246,228,.45);
      background:
        linear-gradient(135deg, rgba(20,184,166,.24), rgba(255,255,255,.06)),
        repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0 1px, transparent 1px 10px);
    }
    .hero-meter strong { font-size: 58px; line-height: .9; }
    .hero-meter span, .hero-meter small { color: #ccfbf1; font-weight: 800; text-align: center; }
    .metric-strip { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
    .metric-strip article, .panel { padding: 18px; }
    .metric-strip span, .metric-strip small, .muted, .steps p, .activity-list p, .experiment-list p, .playbook-list p, .app-grid p, .compliance-list p { color: #aebed4; }
    .metric-strip span { display: block; font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .metric-strip strong { display: block; margin-top: 6px; font-size: 28px; }
    .grid-two { display: grid; grid-template-columns: minmax(0, 1.18fr) minmax(0, .82fr); gap: 18px; }
    .grid-three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    .panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .completion, .score {
      border-radius: 999px;
      padding: 8px 12px;
      background: rgba(153,246,228,.12);
      color: #99f6e4;
      font-weight: 900;
      white-space: nowrap;
    }
    .steps { display: grid; gap: 10px; padding: 0; margin: 0; list-style: none; }
    .steps li {
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 12px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 8px;
      background: rgba(255,255,255,.035);
    }
    .steps li.done { border-color: rgba(34,197,94,.45); background: rgba(34,197,94,.08); }
    .step-dot { width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; background: rgba(255,255,255,.1); color: #86efac; font-weight: 900; }
    .steps strong { display: block; }
    .steps p { margin: 4px 0 0; line-height: 1.45; }
    .steps a, .action, .text-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      border-radius: 8px;
      padding: 8px 12px;
      border: 1px solid rgba(153,246,228,.28);
      color: #ccfbf1;
      font-weight: 900;
      text-decoration: none;
      white-space: nowrap;
    }
    .action.primary { border-color: #14b8a6; background: #14b8a6; color: #06221f; }
    .health-bar { height: 10px; border-radius: 999px; background: rgba(255,255,255,.1); overflow: hidden; margin-bottom: 16px; }
    .health-bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #14b8a6, #a3e635); }
    .health-bar.amber span { background: linear-gradient(90deg, #f59e0b, #14b8a6); }
    .health-grid, .app-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .health-grid div, .app-grid article, .experiment-list div, .activity-list div, .playbook-list div, .compliance-list div, .quality-list div, .blueprint-list div {
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 8px;
      padding: 12px;
      background: rgba(255,255,255,.035);
    }
    .health-grid div.good { border-color: rgba(34,197,94,.4); }
    .quality-list div.good { border-color: rgba(20,184,166,.42); }
    .health-grid span, .app-grid span, .experiment-list span, .playbook-list span, .blueprint-list span { display: block; color: #99f6e4; font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .experiment-list, .activity-list, .playbook-list, .compliance-list, .quality-list, .blueprint-list { display: grid; gap: 10px; }
    .blueprint-list { max-height: 430px; overflow: auto; padding-right: 4px; }
    .experiment-list span.ready { color: #bef264; }
    .app-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .compliance-list div.high { border-color: rgba(251,146,60,.42); }
    .package-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .package-row span { border-radius: 999px; border: 1px solid rgba(255,255,255,.12); padding: 7px 10px; color: #e5e7eb; font-size: 12px; font-weight: 800; }
    .empty { text-align: center; padding: 42px; }
    .skeleton { min-height: 320px; opacity: .6; }
    @media (max-width: 1050px) {
      .grid-two, .grid-three, .metric-strip, .app-grid { grid-template-columns: 1fr 1fr; }
      .hero-band { display: grid; }
      .hero-meter { width: 170px; }
    }
    @media (max-width: 720px) {
      .grid-two, .grid-three, .metric-strip, .app-grid, .health-grid { grid-template-columns: 1fr; }
      .steps li { grid-template-columns: 28px minmax(0, 1fr); }
      .steps a { grid-column: 2; justify-self: start; }
    }
  `],
})
export class GrowthHubPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly notify = inject(NotificationService);

  protected readonly hub = signal<GrowthHub | null>(null);
  protected readonly loading = signal(true);

  protected readonly completedSteps = computed(() => this.hub()?.launchSteps.filter((s) => s.complete).length ?? 0);
  protected readonly metricCards = computed(() => {
    const m = this.hub()?.metrics;
    if (!m) return [];
    return [
      { label: 'Sites', value: m['sites'] ?? 0, hint: 'tenant' },
      { label: 'Pages', value: m['pages'] ?? 0, hint: `${m['publishedPages'] ?? 0} published` },
      { label: 'Domains', value: m['activeDomains'] ?? 0, hint: 'active' },
      { label: 'Leads', value: m['leads'] ?? 0, hint: 'captured' },
      { label: 'Events', value: m['analyticsEvents'] ?? 0, hint: 'analytics' },
      { label: 'MADCloud', value: m['madcloudGenerations'] ?? 0, hint: 'jobs' },
    ];
  });

  ngOnInit(): void {
    const workspace = this.auth.currentWorkspace();
    if (!workspace) {
      this.loading.set(false);
      return;
    }
    const tenant = this.tenantCtx.current();
    this.api.get<GrowthHub>('/universe/growth-hub', {
      workspaceId: workspace.workspaceId,
      tenantId: tenant?.id,
    }).subscribe({
      next: (hub) => {
        this.hub.set(hub);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.notify.error(err.message || 'Failed to load Growth Hub.');
      },
    });
  }
}
