import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { NotificationService } from '../../core/services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface TenantSummary { id: string; slug: string; name: string; industry?: string | null; description?: string | null; }

const STYLES = ['modern', 'luxury', 'corporate', 'playful', 'futuristic', 'minimal', 'brutalist', 'glassmorphism', 'cyberpunk', 'premium-saas', 'church-ministry', 'medical', 'legal', 'recruitment'];
const LAYOUTS = ['one-page', 'multi-page', 'app-dashboard', 'portal', 'landing-page', 'ecommerce', 'directory', 'crm', 'booking-system'];
const PAGES = ['home', 'about', 'services', 'pricing', 'contact', 'blog', 'portal', 'dashboard', 'login', 'register', 'booking'];
const WORKFLOWS = ['CRM', 'bookings', 'invoicing', 'AI assistant', 'forms', 'workflows', 'automation', 'analytics', 'chat', 'notifications', 'CMS', 'knowledge base', 'document storage', 'task management'];
const MOODS = ['premium', 'playful', 'trustworthy', 'futuristic', 'warm', 'bold', 'calm', 'serious'];
const VOICE_KEYWORDS = ['confident', 'friendly', 'authoritative', 'witty', 'minimal', 'expressive', 'technical', 'inspiring', 'reassuring'];
const GOOGLE_FONTS = ['Inter', 'Manrope', 'Sora', 'Plus Jakarta Sans', 'Space Grotesk', 'DM Sans', 'Poppins', 'Outfit', 'Playfair Display', 'DM Serif Display', 'Fraunces', 'Lora', 'Raleway', 'Montserrat'];

interface OnboardingResponse {
  companyName?: string | null;
  slogan?: string | null;
  industry?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  locale?: string | null;
  currency?: string | null;
  competitors?: string[] | null;
  brandMood?: string | null;
  colorPreference?: string | null;
  mode?: '' | 'light' | 'dark' | null;
  brandVoice?: string | null;
  hasLogo?: boolean | null;
  logoUrl?: string | null;
  iconUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  letterheadUrl?: string | null;
  visualStyle?: string | null;
  layout?: string | null;
  pages?: string[] | null;
  workflows?: string[] | null;
  integrations?: string[] | null;
  voiceKeywords?: string[] | null;
}

interface IntegrationCatalogItem {
  key: string;
  name: string;
  category: string;
  description: string | null;
  iconUrl: string | null;
  popular: boolean;
}

type Phase = 'idle' | 'queuing' | 'building' | 'done' | 'error';

@Component({
  selector: 'mc-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="max-w-3xl mx-auto h-[calc(100dvh-9rem)] flex flex-col">
    <div class="shrink-0 mb-8">
      <span class="mc-eyebrow">Onboarding</span>
      @if (editingTenantId()) {
        <h1 class="mc-heading text-3xl font-bold mt-1">Re-onboard <span class="text-brand">{{ form.value.companyName || 'this tenant' }}</span>.</h1>
        <p class="text-fg-muted mt-1">Editing the saved onboarding answers for tenant <code>{{ editingTenantId() }}</code>. Re-generating replaces this tenant's site — it doesn't create a new one.</p>
        <a routerLink="/app/tenants" class="text-sm text-brand hover:underline mt-1 inline-block">← Back to tenants</a>
      } @else {
        <h1 class="mc-heading text-3xl font-bold mt-1">Generate your first system.</h1>
        <p class="text-fg-muted mt-1">Answer a few questions. We'll hand you a Claude Code prompt, you'll paste the JSON back, and the platform builds the site.</p>
      }
    </div>

    <!-- Progress -->
    <div class="shrink-0 flex items-center gap-2 mb-8">
      @for (s of steps; track s; let i = $index) {
        <div class="flex-1 h-1 rounded-full transition-colors"
             [class.bg-brand]="i <= step()"
             [class.bg-white]="i > step()"
             [class.bg-opacity-10]="i > step()"></div>
      }
    </div>

    <div class="mc-card p-6 md:p-8 flex flex-col flex-1 min-h-0">
      <form [formGroup]="form" class="flex flex-col flex-1 min-h-0">
        <div class="flex-1 overflow-y-auto min-h-0 pr-1">
        @switch (step()) {

          @case (0) {
            <h2 class="mc-heading text-xl font-semibold mb-4">Tell us about the business</h2>
            <div class="space-y-4">
              <div><label class="mc-label">Company name</label><input class="mc-input" formControlName="companyName" placeholder="Acme Group" /></div>
              <div><label class="mc-label">Slogan (optional)</label><input class="mc-input" formControlName="slogan" /></div>
              <div><label class="mc-label">Industry</label><input class="mc-input" formControlName="industry" placeholder="SaaS, Medical, Church, …" /></div>
              <div><label class="mc-label">Description</label><textarea class="mc-input min-h-24" formControlName="description"></textarea></div>
              <div><label class="mc-label">Target audience</label><input class="mc-input" formControlName="targetAudience" /></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="mc-label">Locale</label><input class="mc-input" formControlName="locale" placeholder="en-ZA" /></div>
                <div><label class="mc-label">Currency</label><input class="mc-input" formControlName="currency" placeholder="ZAR" /></div>
              </div>
              <div>
                <label class="mc-label">Competitor URLs (one per line, optional)</label>
                <textarea class="mc-input min-h-20" formControlName="competitorsText" placeholder="https://competitor1.com&#10;https://competitor2.com"></textarea>
              </div>
            </div>
          }

          @case (1) {
            <h2 class="mc-heading text-xl font-semibold mb-4">Brand identity</h2>
            <p class="text-sm text-fg-muted mb-4">The AI will generate the actual logo concept, palette, and typography. These are your hints.</p>

            <label class="mc-label">Brand mood</label>
            <div class="flex flex-wrap gap-2 mb-5">
              @for (m of moods; track m) {
                <button type="button" class="mc-chip cursor-pointer transition-all capitalize"
                        [class.bg-brand]="form.value.brandMood === m"
                        [class.bg-opacity-20]="form.value.brandMood === m"
                        [class.border-brand]="form.value.brandMood === m"
                        (click)="form.patchValue({ brandMood: m })">{{ m }}</button>
              }
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="mc-label">Color preference (free-text)</label>
                <input class="mc-input" formControlName="colorPreference" placeholder="purple, vibrant, monochrome…" />
              </div>
              <div>
                <label class="mc-label">Mode</label>
                <div class="flex gap-2">
                  <button type="button" class="mc-chip flex-1 cursor-pointer transition-all"
                          [class.bg-brand]="form.value.mode === 'light'"
                          [class.bg-opacity-20]="form.value.mode === 'light'"
                          [class.border-brand]="form.value.mode === 'light'"
                          (click)="form.patchValue({ mode: 'light' })">Light</button>
                  <button type="button" class="mc-chip flex-1 cursor-pointer transition-all"
                          [class.bg-brand]="form.value.mode === 'dark'"
                          [class.bg-opacity-20]="form.value.mode === 'dark'"
                          [class.border-brand]="form.value.mode === 'dark'"
                          (click)="form.patchValue({ mode: 'dark' })">Dark</button>
                </div>
              </div>
            </div>

            <label class="mc-label mt-5">Voice keywords</label>
            <div class="flex flex-wrap gap-2 mb-4">
              @for (v of voiceKeywords; track v) {
                <button type="button" class="mc-chip cursor-pointer transition-all"
                        [class.bg-brand]="selectedVoice().includes(v)"
                        [class.bg-opacity-20]="selectedVoice().includes(v)"
                        [class.border-brand]="selectedVoice().includes(v)"
                        (click)="toggle('voiceKeywords', v)">{{ v }}</button>
              }
            </div>

            <label class="mc-label">Brand voice (free-text, optional)</label>
            <input class="mc-input" formControlName="brandVoice" placeholder="Confident. Futuristic. Premium." />

            <div class="mt-4 flex items-center gap-2">
              <input id="hasLogo" type="checkbox" formControlName="hasLogo" class="w-4 h-4" />
              <label for="hasLogo" class="text-sm text-fg-muted">I already have a logo (I'll upload it separately)</label>
            </div>
          }

          @case (2) {
            <h2 class="mc-heading text-xl font-semibold mb-4">Corporate Identity</h2>
            <p class="text-sm text-fg-muted mb-4">Upload your existing brand assets or let AI generate them for you.</p>

            <div class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="mc-label">Primary Color</label>
                  <div class="flex gap-2 items-center">
                    <input type="color" [value]="form.value.primaryColor || '#7C5CFF'" (input)="form.patchValue({ primaryColor: $any($event.target).value })" class="w-10 h-10 rounded cursor-pointer border border-white/10 bg-transparent" />
                    <input class="mc-input flex-1" formControlName="primaryColor" placeholder="#7C5CFF" />
                  </div>
                </div>
                <div>
                  <label class="mc-label">Secondary Color</label>
                  <div class="flex gap-2 items-center">
                    <input type="color" [value]="form.value.secondaryColor || '#1E1B4B'" (input)="form.patchValue({ secondaryColor: $any($event.target).value })" class="w-10 h-10 rounded cursor-pointer border border-white/10 bg-transparent" />
                    <input class="mc-input flex-1" formControlName="secondaryColor" placeholder="#1E1B4B" />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="mc-label">Heading Font</label>
                  <select class="mc-input" formControlName="headingFont">
                    <option value="">— Select —</option>
                    @for (f of googleFonts; track f) {
                      <option [value]="f">{{ f }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="mc-label">Body Font</label>
                  <select class="mc-input" formControlName="bodyFont">
                    <option value="">— Select —</option>
                    @for (f of googleFonts; track f) {
                      <option [value]="f">{{ f }}</option>
                    }
                  </select>
                </div>
              </div>

              <div><label class="mc-label">Logo URL</label><input class="mc-input" formControlName="logoUrl" placeholder="https://… or leave blank for AI generation" /></div>
              <div><label class="mc-label">Icon URL</label><input class="mc-input" formControlName="iconUrl" placeholder="https://…" /></div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="mc-label">Favicon URL</label><input class="mc-input" formControlName="faviconUrl" placeholder="https://…" /></div>
                <div><label class="mc-label">Letterhead URL</label><input class="mc-input" formControlName="letterheadUrl" placeholder="https://…" /></div>
              </div>
            </div>

            <div class="mt-6 mc-glass p-4 rounded-md">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-medium">Don't have brand assets?</div>
                  <div class="text-xs text-fg-muted">AI will generate colors, fonts, and a logo concept based on your business details.</div>
                </div>
                @if (ciTaskId() && ciTaskStatus() !== 'COMPLETED' && ciTaskStatus() !== 'FAILED') {
                  <div class="flex items-center gap-2 text-sm text-fg-muted whitespace-nowrap">
                    <div class="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                    Generating…
                  </div>
                } @else if (ciTaskStatus() === 'COMPLETED') {
                  <div class="text-sm text-success whitespace-nowrap"><i class="fa-solid fa-check"></i> Generated</div>
                } @else {
                  <button type="button" class="mc-btn-secondary !px-4 !py-2 text-sm whitespace-nowrap" (click)="generateCorporateIdentity()" [disabled]="ciGenerating()">
                    @if (ciGenerating()) { Creating… } @else { <i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI }
                  </button>
                }
              </div>
              @if (ciTaskStatus() === 'FAILED') {
                <div class="text-xs text-danger mt-2">Generation failed. Try again or fill in manually.</div>
              }
            </div>
          }

          @case (3) {
            <h2 class="mc-heading text-xl font-semibold mb-4">Visual style & layout</h2>

            <label class="mc-label">Visual style</label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
              @for (s of styles; track s) {
                <button type="button"
                        class="px-4 py-3 rounded-md border text-sm transition-all capitalize"
                        [class.border-brand]="form.value.visualStyle === s"
                        [class.bg-brand]="form.value.visualStyle === s"
                        [class.bg-opacity-10]="form.value.visualStyle === s"
                        [class.border-white]="form.value.visualStyle !== s"
                        [class.border-opacity-10]="form.value.visualStyle !== s"
                        [class.text-fg-muted]="form.value.visualStyle !== s"
                        (click)="form.patchValue({ visualStyle: s })">{{ s.replace('-', ' ') }}</button>
              }
            </div>

            <label class="mc-label">Layout</label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
              @for (l of layouts; track l) {
                <button type="button"
                        class="px-4 py-3 rounded-md border text-sm transition-all capitalize"
                        [class.border-brand]="form.value.layout === l"
                        [class.bg-brand]="form.value.layout === l"
                        [class.bg-opacity-10]="form.value.layout === l"
                        [class.border-white]="form.value.layout !== l"
                        [class.border-opacity-10]="form.value.layout !== l"
                        [class.text-fg-muted]="form.value.layout !== l"
                        (click)="form.patchValue({ layout: l })">{{ l.replace('-', ' ') }}</button>
              }
            </div>
          }

          @case (4) {
            <h2 class="mc-heading text-xl font-semibold mb-4">Pages & workflows</h2>
            <label class="mc-label">Pages</label>
            <div class="flex flex-wrap gap-2 mb-6">
              @for (p of pages; track p) {
                <button type="button" class="mc-chip cursor-pointer transition-all"
                        [class.bg-brand]="selectedPages().includes(p)"
                        [class.bg-opacity-20]="selectedPages().includes(p)"
                        [class.border-brand]="selectedPages().includes(p)"
                        (click)="toggle('pages', p)">{{ p }}</button>
              }
            </div>
            <label class="mc-label">Workflows</label>
            <div class="flex flex-wrap gap-2">
              @for (w of workflows; track w) {
                <button type="button" class="mc-chip cursor-pointer transition-all"
                        [class.bg-brand]="selectedWorkflows().includes(w)"
                        [class.bg-opacity-20]="selectedWorkflows().includes(w)"
                        [class.border-brand]="selectedWorkflows().includes(w)"
                        (click)="toggle('workflows', w)">{{ w }}</button>
              }
            </div>
          }

          @case (5) {
            <h2 class="mc-heading text-xl font-semibold mb-2">Integrations</h2>
            <p class="text-sm text-fg-muted mb-5">Pick everything this business actually uses. The AI weaves them into the site copy and suggests where each one slots in.</p>

            @if (catalogLoading()) {
              <div class="text-sm text-fg-muted">Loading catalog…</div>
            } @else if (catalogError()) {
              <div class="text-sm text-danger">{{ catalogError() }}</div>
            } @else {
              <!-- Sticky search + counter + suggest -->
              <div class="sticky top-0 z-10 -mx-6 px-6 py-3 mb-4 mc-glass border-b border-white/5">
                <div class="flex items-center gap-3">
                  <input type="text"
                         class="mc-input !py-2 flex-1 text-sm"
                         placeholder="Search integrations (e.g. 'stripe', 'crm', 'shipping')…"
                         [value]="integrationFilter()"
                         (input)="setIntegrationFilter($any($event.target).value)" />
                  <button type="button" class="mc-btn-secondary !px-3 !py-1.5 text-xs whitespace-nowrap"
                          (click)="suggestForIndustry()"
                          [title]="'Auto-pick integrations for industry: ' + (form.value.industry || '—')">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Suggest for my industry
                  </button>
                  <div class="text-xs text-fg-muted whitespace-nowrap">
                    <span class="text-brand font-semibold">{{ selectedIntegrations().length }}</span> selected
                  </div>
                  @if (selectedIntegrations().length > 0) {
                    <button type="button" class="mc-btn-ghost !px-3 !py-1.5 text-xs" (click)="clearIntegrations()">Clear</button>
                  }
                </div>
                @if (suggestError()) { <div class="text-xs text-danger mt-2">{{ suggestError() }}</div> }
              </div>

              <!-- Popular row -->
              @if (!integrationFilter() && popularItems().length > 0) {
                <div class="mb-6">
                  <div class="flex items-baseline gap-2 mb-2">
                    <div class="text-xs uppercase tracking-wide text-brand"><i class="fa-solid fa-star"></i> Popular</div>
                    <div class="text-xs text-fg-subtle/60">· {{ popularItems().length }}</div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @for (i of popularItems(); track i.key) {
                      <button type="button" class="mc-chip cursor-pointer transition-all text-xs flex items-center gap-1.5"
                              [class.bg-brand]="selectedIntegrations().includes(i.key)"
                              [class.bg-opacity-20]="selectedIntegrations().includes(i.key)"
                              [class.border-brand]="selectedIntegrations().includes(i.key)"
                              [title]="i.description"
                              (click)="toggle('integrations', i.key)">
                        @if (i.iconUrl) {
                          <img [src]="i.iconUrl" class="w-3.5 h-3.5 opacity-80" loading="lazy" alt="" onerror="this.style.display='none'" />
                        }
                        {{ i.name }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Category grid -->
              <div class="pr-2 space-y-5">
                @for (cat of filteredCatalogByCategory(); track cat.category) {
                  <div>
                    <div class="flex items-baseline gap-2 mb-2 sticky top-0 bg-surface/80 py-1">
                      <div class="text-xs uppercase tracking-wide text-fg-subtle">{{ formatCategory(cat.category) }}</div>
                      <div class="text-xs text-fg-subtle/60">·</div>
                      <div class="text-xs text-fg-subtle/60">{{ cat.items.length }}</div>
                      @if (selectedCountInCategory(cat.category) > 0) {
                        <div class="text-xs text-brand">· {{ selectedCountInCategory(cat.category) }} selected</div>
                      }
                    </div>
                    <div class="flex flex-wrap gap-2">
                      @for (i of cat.items; track i.key) {
                        <button type="button" class="mc-chip cursor-pointer transition-all text-xs flex items-center gap-1.5"
                                [class.bg-brand]="selectedIntegrations().includes(i.key)"
                                [class.bg-opacity-20]="selectedIntegrations().includes(i.key)"
                                [class.border-brand]="selectedIntegrations().includes(i.key)"
                                [title]="i.description"
                                (click)="toggle('integrations', i.key)">
                          @if (i.iconUrl) {
                            <img [src]="i.iconUrl" class="w-3.5 h-3.5 opacity-80" loading="lazy" alt="" onerror="this.style.display='none'" />
                          }
                          {{ i.name }}
                        </button>
                      }
                    </div>
                  </div>
                }
                @if (filteredCatalogByCategory().length === 0) {
                  <div class="text-sm text-fg-muted text-center py-12">No matches. Try a different search.</div>
                }
              </div>
            }
          }

          @case (6) {
            <h2 class="mc-heading text-xl font-semibold mb-4">Generate</h2>

            @switch (phase()) {
              @case ('idle') {
                <p class="text-fg-muted mb-6">We'll create your tenant, draft your full corporate identity + site, and hand it back to you ready to publish. This takes 1–3 minutes.</p>
                <div class="mc-glass p-4 rounded-md text-sm space-y-1">
                  <div><b>{{ form.value.companyName }}</b> — {{ form.value.industry }}</div>
                  <div class="text-fg-muted">Mood: {{ form.value.brandMood ?? '—' }} · Mode: {{ form.value.mode ?? '—' }}</div>
                  <div class="text-fg-muted">Style: {{ form.value.visualStyle }} · Layout: {{ form.value.layout }}</div>
                  <div class="text-fg-muted">Pages: {{ selectedPages().join(', ') || '—' }}</div>
                  <div class="text-fg-muted">Workflows: {{ selectedWorkflows().join(', ') || '—' }}</div>
                  <div class="text-fg-muted">Integrations: {{ selectedIntegrations().length }} selected</div>
                </div>
                @if (error()) { <div class="text-sm text-danger mt-4">{{ error() }}</div> }
              }

              @case ('queuing') {
                <div class="flex items-center gap-3 text-sm text-fg-muted">
                  <div class="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                  Setting things up…
                </div>
              }

              @case ('building') {
                <div class="space-y-4">
                  <div class="mc-glass p-6 rounded-lg text-center">
                    <div class="w-10 h-10 mx-auto mb-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                    <h3 class="mc-heading text-lg font-semibold mb-2">Our experts are busy building your application</h3>
                    <p class="text-sm text-fg-muted max-w-md mx-auto">
                      We're crafting the brand identity, designing page layouts, and writing on-brand copy for <b>{{ form.value.companyName }}</b>.
                      You'll be notified and redirected automatically when everything is ready.
                    </p>
                    <p class="text-xs text-fg-subtle mt-3">This usually takes 1–3 minutes. You can safely navigate away — we'll notify you when it's done.</p>
                  </div>
                </div>
              }

              @case ('done') {
                <div class="space-y-3">
                  <div class="text-sm"><i class="fa-solid fa-check"></i> Your site is live at
                    <a class="text-brand hover:underline" [href]="'/' + tenantSlug()" target="_blank">/{{ tenantSlug() }}</a>.
                  </div>
                  <div class="text-xs text-fg-muted">Redirecting in a moment…</div>
                </div>
              }

              @case ('error') {
                <div class="text-sm text-danger">{{ error() }}</div>
              }
            }
          }
        }
        </div>

        <div class="flex items-center justify-between mt-4 pt-4 border-t border-white/5 shrink-0">
          <button type="button" class="mc-btn-ghost" (click)="back()" [disabled]="step() === 0 || phase() === 'building'">← Back</button>

          @if (step() < steps.length - 1) {
            <button type="button" class="mc-btn-primary" (click)="next()" [disabled]="!canAdvance()">Next →</button>
          } @else {
            @switch (phase()) {
              @case ('idle') {
                <button type="button" class="mc-btn-primary" (click)="generatePrompt()" [disabled]="submitting()">
                  @if (submitting()) { Working… } @else { <i class="fa-solid fa-wand-magic-sparkles"></i> Generate my site }
                </button>
              }
              @case ('building') {
                <button type="button" class="mc-btn-primary" disabled>Building…</button>
              }
              @case ('done') {
                <a class="mc-btn-primary" [href]="'/' + tenantSlug()" target="_blank">Open site →</a>
              }
              @default {
                <span></span>
              }
            }
          }
        </div>
      </form>
    </div>
  </div>
  `,
})
export class OnboardingPage implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly notifyService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** If set, the wizard is editing an existing tenant — no new tenant gets created on submit. */
  protected readonly editingTenantId = signal<string | null>(null);

  protected readonly steps = ['Business', 'Brand', 'Identity', 'Style', 'Pages', 'Integrations', 'Generate'];
  protected readonly googleFonts = GOOGLE_FONTS;
  protected readonly styles = STYLES;
  protected readonly layouts = LAYOUTS;
  protected readonly pages = PAGES;
  protected readonly workflows = WORKFLOWS;
  protected readonly moods = MOODS;
  protected readonly voiceKeywords = VOICE_KEYWORDS;

  protected readonly step = signal(0);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  // Corporate Identity AI generation.
  protected readonly ciTaskId = signal<number | null>(null);
  protected readonly ciTaskStatus = signal<string | null>(null);
  protected readonly ciGenerating = signal(false);

  // Catalog of integrations from the API.
  protected readonly catalog = signal<IntegrationCatalogItem[]>([]);
  protected readonly catalogLoading = signal(false);
  protected readonly catalogError = signal<string | null>(null);
  protected readonly integrationFilter = signal('');

  /** Curated order so the most commonly-needed categories appear first. */
  private readonly CATEGORY_ORDER = [
    'PAYMENT', 'CRM', 'MARKETING', 'EMAIL', 'SMS_VOICE', 'SOCIAL', 'ADS',
    'AUTH', 'DOCUMENTS', 'ECOMMERCE', 'SHIPPING', 'SUPPORT',
    'ANALYTICS', 'AI', 'VECTOR', 'AGENT',
    'CMS', 'SEARCH', 'CLOUD', 'MEDIA',
    'COMMUNICATION', 'CALENDAR', 'PRODUCTIVITY', 'ACCOUNTING', 'AUTOMATION', 'STORAGE',
    'HR', 'LEGAL', 'MAPS', 'OTHER',
  ];

  private groupByCategory(items: IntegrationCatalogItem[]) {
    const byCat = new Map<string, IntegrationCatalogItem[]>();
    for (const i of items) {
      const arr = byCat.get(i.category) ?? [];
      arr.push(i);
      byCat.set(i.category, arr);
    }
    return Array.from(byCat.entries())
      .map(([category, items]) => ({ category, items }))
      .sort((a, b) => {
        const ai = this.CATEGORY_ORDER.indexOf(a.category); const bi = this.CATEGORY_ORDER.indexOf(b.category);
        return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      });
  }

  protected readonly catalogByCategory = computed(() => this.groupByCategory(this.catalog()));

  /** Items marked popular=true in the catalog — shown in a featured row. */
  protected readonly popularItems = computed(() => this.catalog().filter((i) => i.popular));

  /** Status of the most recent "Suggest for my industry" call. */
  protected readonly suggestError = signal<string | null>(null);

  protected readonly filteredCatalogByCategory = computed(() => {
    const q = this.integrationFilter().trim().toLowerCase();
    if (!q) return this.catalogByCategory();
    const matches = this.catalog().filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.key.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      (i.description ?? '').toLowerCase().includes(q),
    );
    return this.groupByCategory(matches);
  });

  protected setIntegrationFilter(v: string) { this.integrationFilter.set(v); }
  protected clearIntegrations() { this.form.controls.integrations.setValue([]); }

  /**
   * Calls GET /v1/integrations/suggest?industry=<form.industry>. Merges the
   * returned keys into the current selection (union, not replace) so the
   * tenant doesn't lose anything they already picked.
   */
  protected suggestForIndustry() {
    const industry = (this.form.value.industry ?? '').trim();
    this.suggestError.set(null);
    this.api.get<{ industry: string | null; keys: string[] }>('/integrations/suggest', { industry }).subscribe({
      next: (r) => {
        const existing = new Set(this.form.controls.integrations.value);
        const known = new Set(this.catalog().map((i) => i.key));
        for (const k of r.keys) if (known.has(k)) existing.add(k);
        this.form.controls.integrations.setValue(Array.from(existing));
      },
      error: (e: Error) => this.suggestError.set(e.message),
    });
  }
  protected selectedCountInCategory(category: string): number {
    const selected = this.selectedIntegrations();
    return this.catalog().filter((i) => i.category === category && selected.includes(i.key)).length;
  }
  protected formatCategory(category: string): string {
    return category.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Generate flow state.
  protected readonly phase = signal<Phase>('idle');
  protected readonly generationId = signal<string | null>(null);
  protected readonly tenantId = signal<string | null>(null);
  protected readonly tenantSlug = signal<string>('');

  protected readonly form = this.fb.nonNullable.group({
    // Business
    companyName: ['', Validators.required],
    slogan: [''],
    industry: [''],
    description: [''],
    targetAudience: [''],
    locale: [''],
    currency: [''],
    competitorsText: [''],

    // Brand
    brandMood: [''],
    colorPreference: [''],
    mode: ['' as '' | 'light' | 'dark'],
    voiceKeywords: this.fb.nonNullable.control<string[]>([]),
    brandVoice: [''],
    hasLogo: [false],

    // Corporate Identity
    logoUrl: [''],
    iconUrl: [''],
    faviconUrl: [''],
    primaryColor: [''],
    secondaryColor: [''],
    headingFont: [''],
    bodyFont: [''],
    letterheadUrl: [''],

    // Style/Layout
    visualStyle: ['modern'],
    layout: ['multi-page'],

    // Pages/Workflows
    pages: this.fb.nonNullable.control<string[]>(['home', 'about', 'services', 'contact']),
    workflows: this.fb.nonNullable.control<string[]>([]),

    // Integrations
    integrations: this.fb.nonNullable.control<string[]>([]),
  });

  protected selectedPages(): string[]        { return this.form.controls.pages.value; }
  protected selectedWorkflows(): string[]    { return this.form.controls.workflows.value; }
  protected selectedIntegrations(): string[] { return this.form.controls.integrations.value; }
  protected selectedVoice(): string[]        { return this.form.controls.voiceKeywords.value; }

  ngOnInit() {
    this.loadCatalog();

    // Edit mode: /app/onboarding/:tenantId loads the saved answers.
    const tenantId = this.route.snapshot.paramMap.get('tenantId');
    if (tenantId) {
      this.editingTenantId.set(tenantId);
      this.loadExistingAnswers(tenantId);
    } else {
      // Fresh-start mode: hydrate from localStorage so a refresh mid-wizard
      // doesn't blow away the operator's answers. Edit mode skips this —
      // server-side answers are the source of truth there.
      this.restoreFromLocalStorage();
    }

    // Debounce-save every form change to localStorage. We DON'T sync to the
    // server here because the tenant doesn't exist yet — generatePrompt()
    // creates it. Edit mode could sync, but the saved-answers PATCH that
    // already runs at submit covers the persistence we need.
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.editingTenantId()) return; // Edit mode: server is truth.
      if (saveTimer !== null) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => this.persistToLocalStorage(), 400);
    });

    // Also persist step transitions, not just form mutations.
    // (step is a signal, not a form control; valueChanges won't fire for it.)
    // The next/back protected methods will trigger save via step setter wrap.
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** localStorage key — scoped to the workspace so different workspaces don't collide. */
  private storageKey(): string {
    const ws = this.auth.currentWorkspace();
    return `mc.onboarding.draft.${ws?.workspaceId ?? 'anon'}`;
  }

  private persistToLocalStorage() {
    try {
      const payload = {
        savedAt: new Date().toISOString(),
        step: this.step(),
        form: this.form.getRawValue(),
      };
      localStorage.setItem(this.storageKey(), JSON.stringify(payload));
    } catch { /* quota / unavailable — non-fatal */ }
  }

  private restoreFromLocalStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return;
      const payload = JSON.parse(raw);
      if (!payload?.form) return;
      // Patch in saved values — but only fields that are present.
      this.form.patchValue(payload.form, { emitEvent: false });
      if (typeof payload.step === 'number') this.step.set(payload.step);
    } catch { /* malformed — ignore */ }
  }

  /** Called from generatePrompt() on success so we don't restore stale drafts. */
  private clearLocalStorage() {
    try { localStorage.removeItem(this.storageKey()); } catch { /* */ }
  }

  private loadExistingAnswers(tenantId: string) {
    // 1. Tenant summary (for companyName fallback).
    this.api.get<TenantSummary>(`/tenants/${tenantId}`).subscribe({
      next: (t) => {
        this.tenantId.set(t.id);
        this.tenantSlug.set(t.slug);
        this.tenantCtx.set({ id: t.id, slug: t.slug, name: t.name });
        if (!this.form.controls.companyName.value) {
          this.form.patchValue({ companyName: t.name, industry: t.industry ?? '', description: t.description ?? '' });
        }
      },
      error: () => { /* swallow — answers fetch below may still work */ },
    });
    // 2. Saved OnboardingAnswers — preferable, much richer.
    this.api.get<OnboardingResponse>('/onboarding', { tenantId }).subscribe({
      next: (a) => {
        if (!a || Object.keys(a).length === 0) return;
        this.form.patchValue({
          companyName: a.companyName ?? this.form.value.companyName,
          slogan: a.slogan ?? '',
          industry: a.industry ?? this.form.value.industry,
          description: a.description ?? this.form.value.description,
          targetAudience: a.targetAudience ?? '',
          locale: a.locale ?? '',
          currency: a.currency ?? '',
          competitorsText: (a.competitors ?? []).join('\n'),
          brandMood: a.brandMood ?? '',
          colorPreference: a.colorPreference ?? '',
          mode: (a.mode as '' | 'light' | 'dark') ?? '',
          brandVoice: a.brandVoice ?? '',
          hasLogo: !!a.hasLogo,
          logoUrl: a.logoUrl ?? '',
          iconUrl: a.iconUrl ?? '',
          faviconUrl: a.faviconUrl ?? '',
          primaryColor: a.primaryColor ?? '',
          secondaryColor: a.secondaryColor ?? '',
          headingFont: a.headingFont ?? '',
          bodyFont: a.bodyFont ?? '',
          letterheadUrl: a.letterheadUrl ?? '',
          visualStyle: a.visualStyle ?? 'modern',
          layout: a.layout ?? 'multi-page',
        });
        if (Array.isArray(a.pages))         this.form.controls.pages.setValue(a.pages);
        if (Array.isArray(a.workflows))     this.form.controls.workflows.setValue(a.workflows);
        if (Array.isArray(a.integrations))  this.form.controls.integrations.setValue(a.integrations);
        if (Array.isArray(a.voiceKeywords)) this.form.controls.voiceKeywords.setValue(a.voiceKeywords);
      },
      error: () => { /* no saved answers yet — leave defaults */ },
    });
  }

  private loadCatalog() {
    this.catalogLoading.set(true);
    this.api.get<IntegrationCatalogItem[]>('/integrations/catalog').subscribe({
      next: (items) => { this.catalog.set(items); this.catalogLoading.set(false); },
      error: (e: Error) => { this.catalogError.set(e.message); this.catalogLoading.set(false); },
    });
  }

  protected canAdvance(): boolean {
    if (this.step() === 0) return !!this.form.controls.companyName.value;
    return true;
  }
  protected next() {
    if (!this.canAdvance()) return;
    this.step.update((s) => Math.min(s + 1, this.steps.length - 1));
    if (!this.editingTenantId()) this.persistToLocalStorage();
  }
  protected back() {
    this.step.update((s) => Math.max(s - 1, 0));
    if (!this.editingTenantId()) this.persistToLocalStorage();
  }

  protected toggle(key: 'pages' | 'workflows' | 'integrations' | 'voiceKeywords', value: string) {
    const ctrl = this.form.controls[key];
    const current = ctrl.value;
    ctrl.setValue(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  }

  protected generateCorporateIdentity() {
    const v = this.form.getRawValue();
    this.ciGenerating.set(true);
    this.ciTaskStatus.set(null);
    this.api.post<{ id: number }>('/claude-tasks', {
      title: `Corporate Identity for ${v.companyName || 'tenant'}`,
      description: [
        `Generate a complete corporate identity package for:`,
        `Business: ${v.companyName}`,
        `Industry: ${v.industry}`,
        `Description: ${v.description}`,
        `Brand mood: ${v.brandMood}`,
        `Mode: ${v.mode || 'dark'}`,
        ``,
        `Generate and put in the task notes a JSON block:`,
        `{ "primaryColor": "#hex", "secondaryColor": "#hex", "headingFont": "Google Font", "bodyFont": "Google Font", "logoConcept": "description" }`,
      ].join('\n'),
      priority: 2,
    }).subscribe({
      next: (r) => {
        this.ciTaskId.set(r.id);
        this.ciGenerating.set(false);
        this.pollCiTask(r.id);
      },
      error: () => { this.ciGenerating.set(false); this.ciTaskStatus.set('FAILED'); },
    });
  }

  private pollCiTask(id: number) {
    const tick = () => {
      this.api.get<{ id: number; status: string; notes?: string | null }>(`/claude-tasks/${id}`).subscribe({
        next: (t) => {
          this.ciTaskStatus.set(t.status);
          if (t.status === 'COMPLETED' && t.notes) {
            try {
              const match = t.notes.match(/\{[\s\S]*?\}/);
              if (match) {
                const gen = JSON.parse(match[0]);
                const patch: Record<string, string> = {};
                if (gen.primaryColor) patch['primaryColor'] = gen.primaryColor;
                if (gen.secondaryColor) patch['secondaryColor'] = gen.secondaryColor;
                if (gen.headingFont) patch['headingFont'] = gen.headingFont;
                if (gen.bodyFont) patch['bodyFont'] = gen.bodyFont;
                this.form.patchValue(patch);
              }
            } catch { /* notes didn't contain parseable JSON */ }
          } else if (t.status !== 'FAILED') {
            setTimeout(tick, 3000);
          }
        },
        error: () => setTimeout(tick, 5000),
      });
    };
    tick();
  }

  /** Step 6: create-or-reuse tenant + save onboarding + enqueue manual generation → poll until AWAITING_INPUT. */
  async generatePrompt() {
    const ws = this.auth.currentWorkspace();
    if (!ws) { this.error.set('No workspace.'); return; }
    this.submitting.set(true); this.error.set(null); this.phase.set('queuing');

    try {
      const v = this.form.getRawValue();
      const competitors = (v.competitorsText ?? '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

      // 1. Tenant: edit mode reuses the existing tenant; create mode makes a new one.
      let tenant: { id: string; slug: string; name: string };
      if (this.editingTenantId()) {
        tenant = { id: this.editingTenantId()!, slug: this.tenantSlug(), name: v.companyName };
        // Patch the tenant's top-level fields so name/industry/description stay in sync.
        await new Promise<void>((resolve, reject) => {
          this.api.patch(`/tenants/${tenant.id}`,
            { name: v.companyName, industry: v.industry, description: v.description },
            { tenantId: tenant.id }).subscribe({ next: () => resolve(), error: reject });
        });
      } else {
        const slug = v.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        tenant = await new Promise<{ id: string; slug: string; name: string }>((resolve, reject) => {
          this.api.post<{ id: string; slug: string; name: string }>('/tenants',
            { slug, name: v.companyName, industry: v.industry, description: v.description },
            { workspaceId: ws.workspaceId }).subscribe({ next: resolve, error: reject });
        });
      }
      this.tenantId.set(tenant.id);
      this.tenantSlug.set(tenant.slug);
      this.tenantCtx.set({ id: tenant.id, slug: tenant.slug, name: tenant.name });

      // 2. Save the onboarding answers (the whole form).
      const answers = {
        companyName: v.companyName,
        slogan: v.slogan || undefined,
        industry: v.industry || undefined,
        description: v.description || undefined,
        targetAudience: v.targetAudience || undefined,
        locale: v.locale || undefined,
        currency: v.currency || undefined,
        competitors,
        brandMood: v.brandMood || undefined,
        colorPreference: v.colorPreference || undefined,
        mode: v.mode || undefined,
        voiceKeywords: v.voiceKeywords,
        brandVoice: v.brandVoice || undefined,
        hasLogo: v.hasLogo,
        logoUrl: v.logoUrl || undefined,
        iconUrl: v.iconUrl || undefined,
        faviconUrl: v.faviconUrl || undefined,
        primaryColor: v.primaryColor || undefined,
        secondaryColor: v.secondaryColor || undefined,
        headingFont: v.headingFont || undefined,
        bodyFont: v.bodyFont || undefined,
        letterheadUrl: v.letterheadUrl || undefined,
        visualStyle: v.visualStyle,
        layout: v.layout,
        pages: v.pages,
        workflows: v.workflows,
        integrations: v.integrations,
      };
      await new Promise<void>((resolve, reject) => {
        this.api.post('/onboarding', answers, { tenantId: tenant.id }).subscribe({ next: () => resolve(), error: reject });
      });

      // 3. Enqueue the generation — this also drops a /claude task that the
      //    autonomous worker picks up. The end-user never sees the prompt.
      const gen = await new Promise<{ id: string }>((resolve, reject) => {
        this.api.post<{ id: string }>('/onboarding/generate', null, { tenantId: tenant.id }).subscribe({ next: resolve, error: reject });
      });
      this.generationId.set(gen.id);
      this.phase.set('building');
      this.submitting.set(false);

      // 4. Poll until the worker flips it to SUCCESS, then redirect.
      await this.pollUntilSuccess(gen.id);
      this.phase.set('done');
      this.notifyService.notify(
        'Your site is ready!',
        `${this.form.value.companyName} has been built and is live.`,
        '/' + this.tenantSlug(),
      );
      // Clear the draft so future visits to /app/onboarding start clean.
      this.clearLocalStorage();
      setTimeout(() => { window.open('/' + this.tenantSlug(), '_self'); }, 1500);
    } catch (e) {
      this.error.set((e as Error).message);
      this.phase.set('error');
      this.submitting.set(false);
    }
  }

  /**
   * Poll /v1/ai/generations/:id every 4s until the worker transitions it to
   * SUCCESS (or FAILED). Max wait 10 minutes — covers a slow worker iteration
   * cycle. The wizard stays on the "Building..." screen until then.
   */
  private pollUntilSuccess(generationId: string, maxAttempts = 150): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const tick = () => {
        attempts += 1;
        this.api.get<{ status: string; error?: string | null }>(
          `/ai/generations/${generationId}`,
        ).subscribe({
          next: (g) => {
            if (g.status === 'SUCCESS') {
              resolve();
            } else if (g.status === 'FAILED') {
              reject(new Error(g.error ?? 'Site generation failed'));
            } else if (attempts >= maxAttempts) {
              reject(new Error('Site generation is taking longer than expected. Open /app/claude to check the worker queue.'));
            } else {
              setTimeout(tick, 4000);
            }
          },
          error: (e) => reject(e),
        });
      };
      tick();
    });
  }
}
