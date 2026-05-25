import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, interval, switchMap, takeWhile, filter, debounceTime } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { SiteRendererComponent } from '../tenant-render/site-renderer.component';
import { SECTION_REGISTRY, defaultPropsFor } from '@madcreate/shared';

interface Page {
  id: string;
  tenantId: string;
  siteId: string;
  slug: string;
  title: string;
  status: string;
  schema: { sections: Array<{ kind: string; props: Record<string, unknown> }> };
}

type Device = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'mc-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, SiteRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (page(); as p) {
    <div class="grid grid-cols-[280px_1fr_320px] gap-0 -mx-8 -my-10 min-h-screen">
      <!-- Left: section library -->
      <aside class="border-r border-white/5 bg-surface-raised/40 p-4 overflow-y-auto">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-3">Sections</h2>
        <div class="space-y-1">
          @for (s of registry; track s.kind) {
            <button (click)="addSection(s.kind)"
                    class="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-sm transition-colors flex items-center justify-between group">
              <div>
                <div class="font-medium">{{ s.label }}</div>
                <div class="text-xs text-fg-subtle">{{ s.description }}</div>
              </div>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity text-brand"><i class="fa-solid fa-plus"></i></span>
            </button>
          }
        </div>
      </aside>

      <!-- Middle: preview -->
      <main class="flex flex-col bg-surface min-h-screen">
        <div class="h-14 px-5 flex items-center justify-between border-b border-white/5">
          <div>
            <input class="bg-transparent text-sm font-medium focus:outline-none border-b border-transparent focus:border-brand"
                   [(ngModel)]="p.title" (blur)="save()" />
            <div class="text-xs text-fg-subtle">/{{ p.slug }} · {{ p.status }}</div>
          </div>
          <div class="flex items-center gap-1 p-1 rounded-md bg-white/5">
            @for (d of devices; track d) {
              <button (click)="device.set(d)"
                      class="px-3 py-1 rounded text-xs"
                      [class.bg-surface-raised]="device() === d"
                      [class.text-fg]="device() === d"
                      [class.text-fg-muted]="device() !== d">
                {{ d }}
              </button>
            }
          </div>
          <div class="flex items-center gap-2">
            @switch (saveStatus()) {
              @case ('saving') {
                <span class="text-[11px] text-fg-muted animate-pulse">Saving…</span>
              }
              @case ('saved') {
                <span class="text-[11px] text-green-400">Saved</span>
              }
              @case ('error') {
                <span class="text-[11px] text-danger">Save failed</span>
              }
            }
            <button class="mc-btn-ghost !px-2 !py-1 text-xs" (click)="save()" title="Save"><i class="fa-solid fa-check"></i></button>
            <button class="mc-btn-primary !px-2 !py-1 text-xs" (click)="publish()" title="Publish"><i class="fa-solid fa-arrow-up"></i></button>
          </div>
        </div>

        <div class="flex-1 overflow-auto p-6 grid place-items-start">
          <div class="bg-surface-subtle rounded-lg shadow-2xl overflow-hidden mx-auto transition-all duration-300"
               [style.width.px]="deviceWidth()"
               [style.maxWidth]="'100%'">
            <mc-site-renderer
              [sections]="p.schema.sections"
              [tenantId]="p.tenantId"
              [pageSlug]="p.slug"
              [selectedIndex]="selectedIndex()"
              (selectSection)="select($event)"
            />
          </div>
        </div>
      </main>

      <!-- Right: inspector -->
      <aside class="border-l border-white/5 bg-surface-raised/40 p-4 overflow-y-auto">
        @if (selectedSection(); as sec) {
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Inspector — {{ sec.kind }}</h2>
            <button (click)="removeSection()" class="text-xs text-danger hover:underline">Delete</button>
          </div>

          <!-- Recursive inspector: handles primitives, objects, arrays. -->
          <div class="space-y-3">
            <ng-container
              *ngTemplateOutlet="fieldTpl; context: { $implicit: { value: sec.props, path: [], label: '' } }"
            ></ng-container>
          </div>

          <ng-template #fieldTpl let-ctx>
            @if (isPrimitive(ctx.value)) {
              <div>
                @if (ctx.label) { <label class="mc-label">{{ ctx.label }}</label> }
                @if (isLongString(ctx.value)) {
                  <textarea class="mc-input min-h-20"
                            [ngModel]="ctx.value"
                            (ngModelChange)="setAtPath(ctx.path, $event)"></textarea>
                } @else {
                  <input class="mc-input"
                         [type]="inputType(ctx.value)"
                         [ngModel]="ctx.value"
                         (ngModelChange)="setAtPath(ctx.path, coerceForPath(ctx.path, $event))" />
                }
              </div>
            } @else if (isArrayValue(ctx.value)) {
              <details class="rounded border border-white/5 bg-white/[0.02]" [open]="ctx.path.length === 0">
                <summary class="cursor-pointer px-3 py-2 text-xs uppercase tracking-wider text-fg-subtle flex items-center justify-between">
                  <span>{{ ctx.label || 'items' }} ({{ asArray(ctx.value).length }})</span>
                  <span class="text-brand"><i class="fa-solid fa-plus"></i>/<i class="fa-solid fa-minus"></i></span>
                </summary>
                <div class="p-3 space-y-3 border-t border-white/5">
                  @for (item of asArray(ctx.value); track $index) {
                    <div class="rounded border border-white/5 p-2 space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-[10px] uppercase text-fg-subtle">item {{ $index + 1 }}</span>
                        <button class="text-xs text-danger hover:underline"
                                (click)="removeAtPath(joinPath(ctx.path, $index))">remove</button>
                      </div>
                      <ng-container
                        *ngTemplateOutlet="fieldTpl; context: { $implicit: { value: item, path: joinPath(ctx.path, $index), label: '' } }"
                      ></ng-container>
                    </div>
                  }
                  <button class="mc-btn-secondary text-xs w-full"
                          (click)="pushAtPath(ctx.path)"><i class="fa-solid fa-plus"></i> Add item</button>
                </div>
              </details>
            } @else if (isPlainObject(ctx.value)) {
              <details class="rounded border border-white/5 bg-white/[0.02]" [open]="ctx.path.length === 0">
                @if (ctx.path.length > 0) {
                  <summary class="cursor-pointer px-3 py-2 text-xs uppercase tracking-wider text-fg-subtle">
                    {{ ctx.label }}
                  </summary>
                }
                <div class="p-3 space-y-3" [class.border-t]="ctx.path.length > 0" [class.border-white]="ctx.path.length > 0" [class.border-opacity-5]="ctx.path.length > 0">
                  @for (key of objectKeys(ctx.value); track key) {
                    <ng-container
                      *ngTemplateOutlet="fieldTpl; context: { $implicit: { value: asObject(ctx.value)[key], path: joinPath(ctx.path, key), label: key } }"
                    ></ng-container>
                  }
                </div>
              </details>
            } @else {
              <div class="text-xs text-fg-subtle">(unsupported: {{ typeOf(ctx.value) }})</div>
            }
          </ng-template>

          <div class="mt-6">
            <button class="mc-btn-secondary w-full !px-3 !py-2 text-xs" (click)="regenerate(sec.kind)" title="AI regenerate this section">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
            </button>
          </div>

          <div class="mt-6">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-fg-subtle mb-2">Order</h3>
            <div class="flex gap-2">
              <button class="mc-btn-secondary text-xs flex-1" (click)="move(-1)" title="Move up"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="mc-btn-secondary text-xs flex-1" (click)="move(1)" title="Move down"><i class="fa-solid fa-arrow-down"></i></button>
            </div>
          </div>
        } @else {
          <p class="text-sm text-fg-muted">Select a section in the preview to edit it.</p>
        }
      </aside>
    </div>
  }
  `,
})
export class BuilderPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly notify = inject(NotificationService);
  private readonly tenantCtx = inject(TenantContextService);
  private pollSub: Subscription | null = null;
  private readonly save$ = new Subject<void>();
  private saveSub: Subscription | null = null;
  @Input() pageId!: string;

  protected readonly registry = SECTION_REGISTRY;
  protected readonly devices: Device[] = ['desktop', 'tablet', 'mobile'];
  protected readonly device = signal<Device>('desktop');
  protected readonly page = signal<Page | null>(null);
  protected readonly selectedIndex = signal<number | null>(null);
  protected readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  protected readonly selectedSection = computed(() => {
    const p = this.page(); const i = this.selectedIndex();
    if (!p || i == null) return null;
    return p.schema.sections[i] ?? null;
  });

  protected readonly deviceWidth = computed(() => {
    switch (this.device()) {
      case 'mobile': return 390;
      case 'tablet': return 820;
      default: return 1200;
    }
  });

  ngOnInit() {
    this.saveSub = this.save$.pipe(debounceTime(800)).subscribe(() => this.executeSave());
    this.load();
  }
  ngOnDestroy() {
    this.pollSub?.unsubscribe();
    this.saveSub?.unsubscribe();
  }

  private load() {
    this.api.get<Page>(`/pages/${this.pageId}`).subscribe({
      next: (p) => this.page.set(p),
      error: (e: Error) => this.notify.error(e.message ?? 'Failed to load page.'),
    });
  }

  protected select(i: number) { this.selectedIndex.set(i); }

  protected addSection(kind: string) {
    const p = this.page(); if (!p) return;
    // Pull from the shared SECTION_DEFAULTS so backend prompt schema + frontend
    // builder agree on the shape of every section kind.
    const props = defaultPropsFor(kind);
    p.schema.sections.push({ kind, props });
    this.page.set({ ...p });
    this.selectedIndex.set(p.schema.sections.length - 1);
    this.save();
  }

  protected removeSection() {
    const p = this.page(); const i = this.selectedIndex();
    if (!p || i == null) return;
    p.schema.sections.splice(i, 1);
    this.page.set({ ...p });
    this.selectedIndex.set(null);
    this.save();
  }

  protected updateProp(key: string, value: unknown) {
    const sec = this.selectedSection(); if (!sec) return;
    sec.props[key] = value;
    this.page.update((p) => (p ? { ...p } : p));
    this.save();
  }

  protected move(dir: -1 | 1) {
    const p = this.page(); const i = this.selectedIndex();
    if (!p || i == null) return;
    const j = i + dir;
    if (j < 0 || j >= p.schema.sections.length) return;
    [p.schema.sections[i], p.schema.sections[j]] = [p.schema.sections[j], p.schema.sections[i]];
    this.page.set({ ...p });
    this.selectedIndex.set(j);
    this.save();
  }

  protected save() {
    this.saveStatus.set('saving');
    this.save$.next();
  }

  private executeSave() {
    const p = this.page(); if (!p) return;
    this.api.patch(`/pages/${p.id}`, { title: p.title, schema: p.schema }).subscribe({
      next: () => this.saveStatus.set('saved'),
      error: (e: Error) => {
        this.saveStatus.set('error');
        this.notify.error(e.message ?? 'Auto-save failed — your latest changes may not be persisted.');
      },
    });
  }

  protected publish() {
    const p = this.page(); if (!p) return;
    this.api.post(`/pages/${p.id}/publish`).subscribe({
      next: () => { this.load(); this.notify.success('Page published.'); },
      error: (e: Error) => this.notify.error(e.message ?? 'Something went wrong'),
    });
  }

  protected regenerate(kind: string) {
    const p = this.page();
    const idx = this.selectedIndex();
    if (!p || idx == null) return;

    const tenant = this.tenantCtx.current();
    const businessName = tenant?.name ?? p.title ?? 'this site';

    this.notify.success('AI generation started…');
    this.api.post<{ id: string }>('/ai/generate', {
      kind: 'SECTION',
      promptKey: `generate.section.${kind}`,
      jsonMode: true,
      variables: { businessName, sectionKind: kind, pageTitle: p.title, pageSlug: p.slug },
    }, { tenantId: p.tenantId }).subscribe({
      next: (gen) => this.pollGeneration(gen.id, idx),
      error: (e: Error) => this.notify.error(e.message ?? 'Failed to start AI generation.'),
    });
  }

  private pollGeneration(generationId: string, sectionIndex: number) {
    this.pollSub?.unsubscribe();
    const p = this.page();
    if (!p) return;

    this.pollSub = interval(2000).pipe(
      switchMap(() => this.api.get<{ id: string; status: string; output: unknown }>(`/ai/generations/${generationId}`)),
      filter((gen) => gen.status !== 'QUEUED' && gen.status !== 'RUNNING'),
      takeWhile((gen) => gen.status === 'AWAITING_INPUT', true),
    ).subscribe({
      next: (gen) => {
        if (gen.status === 'SUCCESS') {
          this.applyGenerationOutput(sectionIndex, gen.output);
          this.notify.success('AI section applied.');
        } else if (gen.status === 'FAILED') {
          this.notify.error('AI generation failed.');
        }
        // AWAITING_INPUT: manual provider — stop polling, user submits later
      },
      error: (e: Error) => this.notify.error(e.message ?? 'Failed to poll AI generation.'),
    });
  }

  private applyGenerationOutput(sectionIndex: number, output: unknown) {
    const p = this.page();
    if (!p) return;
    const section = p.schema.sections[sectionIndex];
    if (!section) return;

    // output may be section props directly, or wrapped in { props: ... }
    let props: Record<string, unknown> | null = null;
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      const obj = output as Record<string, unknown>;
      if (obj['props'] && typeof obj['props'] === 'object') {
        props = obj['props'] as Record<string, unknown>;
      } else {
        props = obj;
      }
    }
    if (!props) return;

    section.props = props;
    this.page.set({ ...p });
    this.save();
  }

  protected objectKeys(o: unknown) { return Object.keys((o ?? {}) as object); }
  protected isPrimitive(v: unknown): boolean {
    return v == null || ['string', 'number', 'boolean'].includes(typeof v);
  }
  protected isLongString(v: unknown): boolean {
    return typeof v === 'string' && (v.length > 80 || v.includes('\n'));
  }
  protected isArrayValue(v: unknown): v is unknown[] { return Array.isArray(v); }
  protected isPlainObject(v: unknown): v is Record<string, unknown> {
    return v != null && typeof v === 'object' && !Array.isArray(v);
  }
  protected asArray(v: unknown): unknown[] { return Array.isArray(v) ? v : []; }
  protected asObject(v: unknown): Record<string, unknown> { return (v ?? {}) as Record<string, unknown>; }
  protected typeOf(v: unknown): string { return v === null ? 'null' : typeof v; }
  protected inputType(v: unknown): string { return typeof v === 'number' ? 'number' : 'text'; }
  protected joinPath(path: (string | number)[], next: string | number): (string | number)[] {
    return [...path, next];
  }

  /** Inputs come back as strings; coerce based on what was at the path. */
  protected coerceForPath(path: (string | number)[], value: unknown): unknown {
    const original = this.getAtPath(path);
    if (typeof original === 'number' && typeof value === 'string') {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    if (typeof original === 'boolean' && typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return value;
  }

  private getAtPath(path: (string | number)[]): unknown {
    const sec = this.selectedSection();
    if (!sec) return undefined;
    let cur: Record<string, unknown> = sec.props;
    for (const seg of path) {
      if (cur == null) return undefined;
      cur = cur[seg] as Record<string, unknown>;
    }
    return cur;
  }

  /** Walks into sec.props at `path` and writes `value` at the last segment. */
  protected setAtPath(path: (string | number)[], value: unknown) {
    const sec = this.selectedSection(); if (!sec) return;
    if (path.length === 0) { sec.props = value as Record<string, unknown>; }
    else {
      let cur: Record<string, unknown> = sec.props;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Record<string, unknown>;
      cur[path[path.length - 1]] = value;
    }
    this.page.update((p) => (p ? { ...p } : p));
    this.save();
  }

  /** Removes the element at `path` (last segment is array index or object key). */
  protected removeAtPath(path: (string | number)[]) {
    const sec = this.selectedSection(); if (!sec || path.length === 0) return;
    let cur: Record<string, unknown> = sec.props;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Record<string, unknown>;
    const tail = path[path.length - 1];
    if (Array.isArray(cur) && typeof tail === 'number') {
      cur.splice(tail, 1);
    } else if (cur && typeof cur === 'object') {
      delete cur[tail];
    }
    this.page.update((p) => (p ? { ...p } : p));
    this.save();
  }

  /** Pushes a sensibly-shaped new item onto the array at `path`. */
  protected pushAtPath(path: (string | number)[]) {
    const arr = this.getAtPath(path);
    if (!Array.isArray(arr)) return;
    // Clone the shape of the last item if present; else push an empty object.
    const sample = arr[arr.length - 1];
    let next: unknown;
    if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
      next = Object.fromEntries(Object.entries(sample as object).map(([k, v]) => [k, scalarDefault(v)]));
    } else if (typeof sample === 'string') next = '';
    else if (typeof sample === 'number') next = 0;
    else if (typeof sample === 'boolean') next = false;
    else next = '';
    arr.push(next);
    this.page.update((p) => (p ? { ...p } : p));
    this.save();
  }
}

/**
 * Used by pushAtPath to seed a fresh array item with the same shape as the
 * existing items but with scalar defaults instead of cloning their data.
 */
function scalarDefault(v: unknown): unknown {
  if (typeof v === 'string') return '';
  if (typeof v === 'number') return 0;
  if (typeof v === 'boolean') return false;
  if (Array.isArray(v)) return [];
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scalarDefault(x)]));
  }
  return null;
}
