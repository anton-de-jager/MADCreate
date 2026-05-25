import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { NotificationService } from '../../core/services/notification.service';

interface ThemeTokens {
  colors?: Record<string, string>;
  typography?: { headingFamily?: string; bodyFamily?: string; headingWeights?: number[]; bodyWeights?: number[] };
}
interface Theme { id: string; name: string; isActive: boolean; tokens: ThemeTokens; }

const FONT_OPTIONS = ['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Open Sans', 'Lato', 'Raleway', 'Playfair Display', 'Merriweather', 'DM Sans', 'Space Grotesk'];

@Component({
  selector: 'mc-themes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="mb-8 flex items-center justify-between">
    <div>
      <h1 class="mc-heading text-3xl font-bold">Themes</h1>
      <p class="text-fg-muted mt-1">Design tokens that drive your tenant's look.</p>
    </div>
    <div class="flex items-center gap-2">
      <button class="mc-btn-secondary text-sm" (click)="generateFromBrand()" [disabled]="generating()">
        @if (generating()) { Generating… } @else { <i class="fa-solid fa-wand-magic-sparkles"></i> Generate from brand }
      </button>
      <button class="mc-btn-primary text-sm" (click)="createDefault()"><i class="fa-solid fa-plus"></i> New theme</button>
    </div>
  </div>

  @if (!tenant()) {
    <div class="mc-card p-8 text-center text-fg-muted">Pick a tenant first.</div>
  } @else if (loading()) {
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (_ of [1,2,3]; track _) {
        <div class="mc-card p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="h-4 w-24 rounded bg-white/10 animate-pulse"></div>
            <div class="h-5 w-12 rounded bg-white/10 animate-pulse"></div>
          </div>
          <div class="flex gap-1.5 mb-3">
            @for (__ of [1,2,3,4,5,6]; track __) {
              <div class="w-7 h-7 rounded bg-white/10 animate-pulse"></div>
            }
          </div>
          <div class="h-3 w-32 rounded bg-white/10 animate-pulse"></div>
        </div>
      }
    </div>
  } @else {
    <!-- Editor panel -->
    @if (editing()) {
      <div class="mc-card p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <input class="mc-input !text-lg font-semibold !w-auto" [(ngModel)]="editName" />
          <div class="flex gap-2">
            <button class="mc-btn-secondary text-xs" (click)="cancelEdit()">Cancel</button>
            <button class="mc-btn-primary text-xs" (click)="saveEdit()">Save</button>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- Colors -->
          <div>
            <h3 class="text-sm font-medium mb-3 text-fg-muted">Colors</h3>
            <div class="space-y-2">
              @for (key of swatchKeys; track key) {
                <div class="flex items-center gap-3">
                  <label class="text-xs text-fg-subtle w-24">{{ key }}</label>
                  <input type="color" class="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                         [ngModel]="editColors[key] || '#222222'"
                         (ngModelChange)="editColors[key] = $event" />
                  <input class="mc-input !w-28 text-xs font-mono"
                         [ngModel]="editColors[key] || ''"
                         (ngModelChange)="editColors[key] = $event" />
                </div>
              }
            </div>
          </div>

          <!-- Typography + Preview -->
          <div>
            <h3 class="text-sm font-medium mb-3 text-fg-muted">Typography</h3>
            <div class="space-y-3 mb-6">
              <div class="flex items-center gap-3">
                <label class="text-xs text-fg-subtle w-24">Headings</label>
                <select class="mc-input !w-auto text-xs" [(ngModel)]="editHeadingFont">
                  @for (f of fontOptions; track f) { <option [value]="f">{{ f }}</option> }
                </select>
              </div>
              <div class="flex items-center gap-3">
                <label class="text-xs text-fg-subtle w-24">Body</label>
                <select class="mc-input !w-auto text-xs" [(ngModel)]="editBodyFont">
                  @for (f of fontOptions; track f) { <option [value]="f">{{ f }}</option> }
                </select>
              </div>
            </div>

            <h3 class="text-sm font-medium mb-3 text-fg-muted">Preview</h3>
            <div class="rounded-lg p-4 border border-white/10 overflow-hidden"
                 [style.background]="editColors['background'] || '#0B0B12'">
              <div class="text-lg font-bold mb-2"
                   [style.color]="editColors['foreground'] || '#FAFAFA'"
                   [style.font-family]="editHeadingFont">
                Heading Preview
              </div>
              <p class="text-sm mb-3"
                 [style.color]="editColors['muted'] || '#9CA3AF'"
                 [style.font-family]="editBodyFont">
                Body text sample with the current theme tokens applied.
              </p>
              <div class="flex gap-2">
                <span class="px-3 py-1 rounded text-xs text-white" [style.background]="editColors['primary'] || '#7C5CFF'">Primary</span>
                <span class="px-3 py-1 rounded text-xs text-white" [style.background]="editColors['secondary'] || '#0EA5E9'">Secondary</span>
                <span class="px-3 py-1 rounded text-xs text-white" [style.background]="editColors['accent'] || '#F472B6'">Accent</span>
              </div>
              <div class="mt-3 rounded p-2" [style.background]="editColors['surface'] || '#13131C'">
                <span class="text-xs" [style.color]="editColors['foreground'] || '#FAFAFA'">Surface card</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Theme grid -->
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      @for (t of themes(); track t.id) {
        <div class="mc-card-hover p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="mc-heading font-semibold">{{ t.name }}</div>
            @if (t.isActive) { <span class="mc-chip">Active</span> }
          </div>
          <div class="flex gap-1.5 mb-3">
            @for (key of swatchKeys; track key) {
              <div class="w-7 h-7 rounded border border-white/10"
                   [style.background]="t.tokens.colors?.[key] || '#222'"
                   [title]="key + ': ' + (t.tokens.colors?.[key] || '—')"></div>
            }
          </div>
          <div class="text-xs text-fg-muted mb-4">
            {{ t.tokens.typography?.headingFamily ?? '—' }} / {{ t.tokens.typography?.bodyFamily ?? '—' }}
          </div>
          <div class="flex gap-2">
            <button class="mc-btn-secondary flex-1 text-xs" (click)="editTheme(t)">Edit</button>
            <button class="mc-btn-secondary flex-1 text-xs" (click)="duplicate(t)">Duplicate</button>
            @if (!t.isActive) {
              <button class="mc-btn-secondary flex-1 text-xs" (click)="activate(t)">Set active</button>
            }
            <button class="mc-btn-secondary flex-1 text-xs" (click)="deleteTheme(t)">Delete</button>
          </div>
        </div>
      }
      @if (themes().length === 0) {
        <div class="mc-card p-8 col-span-full text-center">
          <p class="text-fg-muted mb-3">No themes yet.</p>
          <button class="mc-btn-primary" (click)="createDefault()"><i class="fa-solid fa-plus"></i> Create default theme</button>
        </div>
      }
    </div>
  }
  `,
})
export class ThemesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly notify = inject(NotificationService);
  protected readonly tenant = this.tenantCtx.current;
  protected readonly themes = signal<Theme[]>([]);
  protected readonly loading = signal(true);
  protected readonly editing = signal<Theme | null>(null);
  protected readonly generating = signal(false);
  protected readonly swatchKeys = ['primary', 'secondary', 'accent', 'background', 'surface', 'foreground', 'muted'];
  protected readonly fontOptions = FONT_OPTIONS;

  protected editName = '';
  protected editColors: Record<string, string> = {};
  protected editHeadingFont = 'Inter';
  protected editBodyFont = 'Inter';

  ngOnInit() { this.refresh(); }

  refresh() {
    const t = this.tenant(); if (!t) { this.loading.set(false); return; }
    this.loading.set(true);
    this.api.get<Theme[]>('/themes', { tenantId: t.id }).subscribe({
      next: (x) => { this.themes.set(x); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  editTheme(t: Theme) {
    this.editing.set(t);
    this.editName = t.name;
    this.editColors = { ...t.tokens.colors };
    this.editHeadingFont = t.tokens.typography?.headingFamily ?? 'Inter';
    this.editBodyFont = t.tokens.typography?.bodyFamily ?? 'Inter';
  }

  cancelEdit() { this.editing.set(null); }

  saveEdit() {
    const t = this.editing();
    if (!t) return;
    const tokens: ThemeTokens = {
      colors: { ...this.editColors },
      typography: {
        ...t.tokens.typography,
        headingFamily: this.editHeadingFont,
        bodyFamily: this.editBodyFont,
      },
    };
    this.api.patch(`/themes/${t.id}`, { name: this.editName, tokens }).subscribe({
      next: () => {
        this.editing.set(null);
        this.refresh();
        this.notify.success('Theme saved.');
      },
      error: (e: Error) => this.notify.error(e.message ?? 'Save failed'),
    });
  }

  activate(t: Theme) {
    this.api.patch(`/themes/${t.id}`, { isActive: true }).subscribe({
      next: () => { this.refresh(); this.notify.success('Theme activated.'); },
      error: (e: Error) => this.notify.error(e.message ?? 'Something went wrong'),
    });
  }

  duplicate(t: Theme) {
    const tenant = this.tenant(); if (!tenant) return;
    this.api.post('/themes', {
      name: `${t.name} (copy)`,
      tokens: structuredClone(t.tokens),
    }, { tenantId: tenant.id }).subscribe({
      next: () => { this.refresh(); this.notify.success('Theme duplicated.'); },
      error: (e: Error) => this.notify.error(e.message ?? 'Duplicate failed'),
    });
  }

  deleteTheme(t: Theme) {
    this.notify.confirm(
      `Delete theme "${t.name}"?`,
      `This theme will be permanently removed. This cannot be undone.`,
      { confirmLabel: 'Delete', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/themes/${t.id}`).subscribe({
        next: () => {
          this.refresh();
          this.notify.success(`Deleted "${t.name}".`);
        },
        error: (e: Error) => this.notify.error(e.message ?? 'Delete failed'),
      });
    });
  }

  generateFromBrand() {
    const tenant = this.tenant(); if (!tenant) return;
    this.generating.set(true);
    this.api.post<Theme>('/ai/generate', { kind: 'PALETTE_TYPOGRAPHY' }, { tenantId: tenant.id }).subscribe({
      next: () => {
        this.generating.set(false);
        this.refresh();
        this.notify.success('AI theme generated from brand.');
      },
      error: (e: Error) => {
        this.generating.set(false);
        this.notify.error(e.message ?? 'Generation failed');
      },
    });
  }

  createDefault() {
    const t = this.tenant(); if (!t) return;
    this.api.post('/themes', {
      name: 'Default',
      tokens: {
        colors: { primary: '#7C5CFF', secondary: '#0EA5E9', accent: '#F472B6', background: '#0B0B12', surface: '#13131C', foreground: '#FAFAFA', muted: '#9CA3AF' },
        typography: { headingFamily: 'Inter', bodyFamily: 'Inter', headingWeights: [600, 800], bodyWeights: [400, 500] },
      },
    }, { tenantId: t.id }).subscribe({
      next: () => { this.refresh(); this.notify.success('Default theme created.'); },
      error: (e: Error) => this.notify.error(e.message ?? 'Something went wrong'),
    });
  }
}
