import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, Input, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';

interface Generation { id: string; kind: string; status: string; output?: unknown; rawOutput?: string; error?: string; tokensIn?: number; tokensOut?: number; durationMs?: number; createdAt: string; }

const KINDS: { value: string; label: string; promptKey?: string; jsonMode?: boolean }[] = [
  { value: 'PAGE',       label: 'Page',           promptKey: 'generate.page',       jsonMode: true },
  { value: 'SECTION',    label: 'Hero section',   promptKey: 'generate.section.hero', jsonMode: true },
  { value: 'PALETTE',    label: 'Color palette',  promptKey: 'generate.palette',    jsonMode: true },
  { value: 'TYPOGRAPHY', label: 'Typography',     promptKey: 'generate.typography', jsonMode: true },
  { value: 'COPY',       label: 'Improve copy',   promptKey: 'generate.copy' },
  { value: 'SEO',        label: 'SEO metadata',   promptKey: 'generate.seo',        jsonMode: true },
];

@Component({
  selector: 'mc-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="grid lg:grid-cols-[380px_1fr] gap-6">
    <!-- Left: composer -->
    <aside class="space-y-4">
      <h1 class="mc-heading text-2xl font-bold">AI Studio</h1>
      <p class="text-sm text-fg-muted">Generate sections, pages, palettes, copy & more.</p>

      <div class="mc-card p-5 space-y-4">
        <div>
          <label class="mc-label">What to generate</label>
          <div class="grid grid-cols-2 gap-2">
            @for (k of kinds; track k.value) {
              <button class="px-3 py-2 rounded-md border text-xs transition-all"
                      [class.border-brand]="selected().value === k.value"
                      [class.bg-brand]="selected().value === k.value"
                      [class.bg-opacity-10]="selected().value === k.value"
                      [class.border-white]="selected().value !== k.value"
                      [class.border-opacity-10]="selected().value !== k.value"
                      [class.text-fg-muted]="selected().value !== k.value"
                      (click)="selected.set(k)">{{ k.label }}</button>
            }
          </div>
        </div>

        <div>
          <label class="mc-label">Brief</label>
          <textarea [(ngModel)]="prompt" rows="6" class="mc-input font-mono text-xs leading-relaxed"
                    placeholder="Describe what you want… (business name, audience, tone)"></textarea>
        </div>

        <button class="mc-btn-primary w-full" (click)="run()" [disabled]="running() || !prompt().trim()">
          @if (running()) { Generating… } @else { <i class="fa-solid fa-wand-magic-sparkles"></i> Generate }
        </button>
      </div>
    </aside>

    <!-- Right: history + result -->
    <section class="space-y-4 min-w-0">
      <div class="flex items-center justify-between">
        <h2 class="mc-heading text-xl font-semibold">Recent generations</h2>
        <span class="text-xs text-fg-subtle">Tenant: <code>{{ tenantId }}</code></span>
      </div>

      @if (history().length === 0) {
        <div class="mc-card p-10 text-center text-fg-muted">
          Nothing yet. Run your first generation.
        </div>
      } @else {
        <div class="space-y-3">
          @for (g of history(); track g.id) {
            <div class="mc-card p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <span class="mc-chip">{{ g.kind }}</span>
                  <span class="text-xs text-fg-subtle font-mono">{{ shortId(g.id) }}</span>
                  <span class="text-xs"
                        [class.text-success]="g.status === 'SUCCESS'"
                        [class.text-warning]="g.status === 'QUEUED' || g.status === 'RUNNING'"
                        [class.text-danger]="g.status === 'FAILED'">
                    {{ g.status }}
                  </span>
                </div>
                <div class="text-xs text-fg-subtle">
                  @if (g.durationMs) { <span>{{ g.durationMs }}ms · </span> }
                  @if (g.tokensIn != null) { <span>{{ g.tokensIn }}/{{ g.tokensOut }} tok</span> }
                </div>
              </div>
              @if (g.error) {
                <pre class="mt-3 text-xs text-danger bg-danger/10 p-3 rounded overflow-x-auto">{{ g.error }}</pre>
              } @else if (g.output) {
                <pre class="mt-3 text-xs bg-surface-subtle p-3 rounded overflow-x-auto max-h-80 overflow-y-auto">{{ formatJson(g.output) }}</pre>
              } @else if (g.rawOutput) {
                <pre class="mt-3 text-xs bg-surface-subtle p-3 rounded overflow-x-auto max-h-80 overflow-y-auto">{{ g.rawOutput }}</pre>
              }
            </div>
          }
        </div>
      }
    </section>
  </div>
  `,
})
export class StudioPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly zone = inject(NgZone);
  @Input() tenantId!: string;

  protected readonly kinds = KINDS;
  protected readonly selected = signal(KINDS[0]);
  protected readonly prompt = signal('Premium SaaS for a fintech serving SMEs in South Africa.');
  protected readonly running = signal(false);
  protected readonly history = signal<Generation[]>([]);

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
      const es = new EventSource(`${this.api.base}/ai/events?token=${encodeURIComponent(token)}`);
      es.onmessage = () => this.zone.run(() => this.refresh());
      es.onerror = () => {
        // Browser will auto-reconnect; nothing extra needed.
      };
      this.eventSource = es;
    });
  }

  refresh() {
    this.api.get<Generation[]>('/ai/generations', { tenantId: this.tenantId }).subscribe({
      next: (g) => this.history.set(g),
      error: (e: Error) => this.notify.error(e.message ?? 'Failed to load generations'),
    });
  }

  run() {
    const kind = this.selected();
    this.running.set(true);
    this.api.post('/ai/generate', {
      kind: kind.value,
      promptKey: kind.promptKey,
      jsonMode: kind.jsonMode,
      variables: { prompt: this.prompt(), brief: this.prompt() },
    }, { tenantId: this.tenantId }).subscribe({
      next: () => { this.running.set(false); this.refresh(); },
      error: (e: Error) => { this.running.set(false); this.notify.error(e.message ?? 'Generation failed'); },
    });
  }

  shortId(id: string): string { return id.slice(0, 8); }
  formatJson(v: unknown): string { try { return JSON.stringify(v, null, 2); } catch { return String(v); } }
}
