import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { SiteRendererComponent } from './site-renderer.component';

interface FooterColumn { heading?: string; links?: Array<{ label: string; href?: string }> }
interface FooterProps { columns?: FooterColumn[]; copyright?: string; [key: string]: unknown }

interface Rendered {
  tenant: { id: string; slug: string; name: string };
  theme: { colors?: Record<string, string>; [key: string]: unknown } | null;
  navigation: { items: { label: string; href: string }[] } | null;
  settings: { faviconUrl?: string } | null;
  pages: Array<{ slug: string; title: string; metaTitle?: string | null; metaDescription?: string | null; schema: { sections: Array<{ kind: string; props: Record<string, unknown> }> } }>;
}

@Component({
  selector: 'mc-tenant-render',
  standalone: true,
  imports: [CommonModule, SiteRendererComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (loading()) {
    <div class="min-h-screen grid place-items-center text-fg-muted">
      <div class="flex items-center gap-3">
        <div class="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
        Loading site…
      </div>
    </div>
  } @else if (error()) {
    <div class="min-h-screen grid place-items-center text-center px-4">
      <div>
        <div class="mc-heading text-2xl font-bold mb-2">Site not found</div>
        <p class="text-fg-muted">/{{ slug }} hasn't been published yet, or doesn't exist.</p>
        <a href="/" class="mc-btn-secondary mt-6 inline-flex">← Back to MADCreate</a>
      </div>
    </div>
  } @else {
    @if (data(); as d) {
      <!-- Tenant header -->
      @if (d.navigation?.items?.length) {
        <header class="sticky top-0 z-40 mc-glass border-b border-white/5">
          <div class="max-w-6xl mx-auto h-16 px-6 flex items-center gap-6">
            <a [href]="'/' + d.tenant.slug" class="mc-heading font-bold">{{ d.tenant.name }}</a>
            <nav class="hidden md:flex items-center gap-1 ml-4">
              @for (item of d.navigation!.items; track item.href) {
                <a [href]="prefixHref(item.href)" class="mc-link px-3 py-2 text-sm">{{ item.label }}</a>
              }
            </nav>
          </div>
        </header>
      }

      @if (currentPage(); as p) {
        <mc-site-renderer [sections]="p.schema.sections" [tenantId]="d.tenant.id" [pageSlug]="p.slug" />
      }

      <!-- Tenant footer -->
      @if (footerProps(); as fp) {
        <footer class="border-t border-white/5 px-6 py-12 mt-12">
          <div class="max-w-6xl mx-auto">
            @if (fp.columns?.length) {
              <div class="grid gap-8 mb-8" [style.grid-template-columns]="'repeat(' + fp.columns!.length + ', minmax(0, 1fr))'">
                @for (col of fp.columns; track $index) {
                  <div>
                    @if (col.heading) { <h4 class="font-semibold text-sm mb-3">{{ col.heading }}</h4> }
                    <ul class="space-y-2">
                      @for (link of (col.links ?? []); track $index) {
                        <li><a [href]="link.href || '#'" class="text-sm text-fg-muted hover:text-fg transition-colors">{{ link.label }}</a></li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }
            <div class="text-center text-xs text-fg-subtle" [class]="fp.columns?.length ? 'pt-6 border-t border-white/5' : ''">
              <div>{{ fp.copyright || '© ' + year + ' ' + d.tenant.name }}</div>
              <div class="mt-1">Powered by <a href="/" class="hover:text-fg">MADCreate</a></div>
            </div>
          </div>
        </footer>
      } @else {
        <footer class="border-t border-white/5 py-10 mt-12 text-center text-xs text-fg-subtle">
          <div>© {{ year }} {{ d.tenant.name }}</div>
          <div class="mt-1">Powered by <a href="/" class="hover:text-fg">MADCreate</a></div>
        </footer>
      }
    }
  }
  `,
})
export class TenantRenderPage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly theme = inject(ThemeService);

  @Input() slug!: string;
  @Input() page?: string;

  protected readonly data = signal<Rendered | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly year = new Date().getFullYear();

  protected readonly currentPage = computed(() => {
    const d = this.data(); if (!d) return null;
    const wanted = this.page || 'home';
    return d.pages.find((p) => p.slug === wanted) ?? d.pages.find((p) => p.slug === 'home') ?? d.pages[0] ?? null;
  });

  /** Extract footer section props from any page (first match wins). */
  protected readonly footerProps = computed(() => {
    const d = this.data(); if (!d) return null;
    for (const page of d.pages) {
      const footer = page.schema.sections.find((s) => s.kind === 'footer');
      if (footer?.props) return footer.props as FooterProps;
    }
    return null;
  });

  ngOnInit() {
    this.api.get<Rendered>('/render/site', { slug: this.slug }).subscribe({
      next: (d) => {
        this.prefixInternalHrefs(d);
        this.data.set(d);
        this.applyTheme(d);
        this.applyMeta();
        this.loading.set(false);
      },
      error: (e) => { this.error.set(e.message); this.loading.set(false); },
    });
  }

  ngOnDestroy() {
    // Restore platform default styling when leaving a tenant site.
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      ['brand', 'accent', 'surface', 'surface-raised', 'surface-subtle', 'fg', 'fg-muted', 'fg-subtle']
        .forEach((k) => root.style.removeProperty(`--${k}`));
    }
  }

  protected prefixHref(href: string): string {
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith(`/${this.slug}`)) return href;
    if (href === '/') return `/${this.slug}`;
    return `/${this.slug}${href.startsWith('/') ? '' : '/'}${href}`;
  }

  private prefixInternalHrefs(d: Rendered) {
    for (const page of d.pages) {
      for (const section of page.schema.sections) {
        this.walkAndPrefixHrefs(section.props);
      }
    }
  }

  private walkAndPrefixHrefs(obj: Record<string, unknown>) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach((item) => this.walkAndPrefixHrefs(item as Record<string, unknown>)); return; }
    for (const key of Object.keys(obj)) {
      if (key === 'href' && typeof obj[key] === 'string') {
        (obj as Record<string, string>)[key] = this.prefixHref(obj[key] as string);
      } else if (typeof obj[key] === 'object') {
        this.walkAndPrefixHrefs(obj[key] as Record<string, unknown>);
      }
    }
  }

  private applyTheme(d: Rendered) {
    const tokens = d.theme?.colors;
    if (!tokens) return;
    const rgb = (hex: string) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
      if (!m) return null;
      const n = parseInt(m[1], 16);
      return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
    };
    const map: Record<string, string> = {};
    const set = (varName: string, hex: string | undefined) => { const v = hex ? rgb(hex) : null; if (v) map[varName] = v; };
    set('brand', tokens.primary);
    set('accent', tokens.accent);
    set('surface', tokens.background);
    set('surface-raised', tokens.surface);
    set('fg', tokens.foreground);
    set('fg-muted', tokens.muted);
    this.theme.applyTokens(map);
  }

  private applyMeta() {
    const p = this.currentPage(); const d = this.data();
    if (!p || !d) return;
    this.title.setTitle(p.metaTitle || `${p.title} — ${d.tenant.name}`);
    if (p.metaDescription) {
      this.meta.updateTag({ name: 'description', content: p.metaDescription });
      this.meta.updateTag({ property: 'og:description', content: p.metaDescription });
    }
    this.meta.updateTag({ property: 'og:title', content: p.metaTitle || p.title });
  }
}
