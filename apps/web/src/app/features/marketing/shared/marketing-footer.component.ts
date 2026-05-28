import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mc-marketing-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <footer class="border-t border-white/5 py-12 mt-12">
    <div class="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8">
      <div>
        <div class="flex items-center gap-2 mb-3">
          <img src="/logo-wide-MADCreate.png" alt="MADCreate" class="h-7 w-auto" />
        </div>
        <p class="text-xs text-fg-subtle">By MAD Prospects. The operating system builder for modern SMEs.</p>
      </div>
      @for (col of cols; track col.title) {
        <div>
          <div class="text-xs font-semibold uppercase tracking-[0.16em] text-fg-subtle mb-3">{{ col.title }}</div>
          <ul class="space-y-2 text-sm text-fg-muted">
            @for (l of col.links; track l.label) {
              <li><a [routerLink]="l.href" class="hover:text-fg transition-colors">{{ l.label }}</a></li>
            }
          </ul>
        </div>
      }
    </div>
    <div class="max-w-6xl mx-auto px-6 mt-12 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
      <span>© {{ year }} MAD Prospects</span>
      <span>madcreate.madprospects.com</span>
    </div>
  </footer>
  `,
})
export class MarketingFooter {
  protected readonly year = new Date().getFullYear();
  protected readonly cols = [
    { title: 'Product', links: [{ label: 'Pricing', href: '/pricing' }, { label: 'Login', href: '/login' }, { label: 'Register', href: '/register' }] },
    { title: 'Build',   links: [{ label: 'Studio', href: '/app/home' }, { label: 'Marketplace', href: '/app/marketplace' }] },
    { title: 'Company', links: [{ label: 'MAD Prospects', href: '/' }] },
  ];
}
