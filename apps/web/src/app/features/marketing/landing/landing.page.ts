import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarketingHeader } from '../shared/marketing-header.component';
import { MarketingFooter } from '../shared/marketing-footer.component';

const MAD_UNIVERSE_APPS = [
  { name: 'MAD Prospects', url: 'https://madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-madprospects.png' },
  { name: 'MADai', url: 'https://madai.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADai.png' },
  { name: 'MADAuthor', url: 'https://madauthor.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADAuthor.png' },
  { name: 'MAD Cloud', url: 'https://madcloud.madprospects.com/', logo: '' },
  { name: 'MADCreate', url: 'https://madcreate.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADCreate.png' },
  { name: 'MADHub', url: 'https://madhub.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADHub.png' },
  { name: 'MADLeads', url: 'https://madleads.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADLeads.png' },
  { name: 'MADLearn', url: 'https://madlearn.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADLearn.png' },
  { name: 'MADLove', url: 'https://madlove.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADLove.png' },
  { name: 'MADMultisciple', url: 'https://madmultisciple.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADMultisciple.png' },
  { name: 'MADPulse', url: 'https://madpulse.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADPulse.png' },
  { name: 'MADRecruiting', url: 'https://madrecruiting.madprospects.com/', logo: 'https://madprospects.com/media/logo-wide-MADRecruiting.png' },
] as const;

@Component({
  selector: 'mc-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MarketingHeader, MarketingFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .mad-universe-strip {
      position: relative;
      overflow: hidden;
      background: #0d1628;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
      padding: 16px 0;
    }
    .mad-universe-inner {
      display: flex;
      align-items: center;
      gap: 24px;
      max-width: 1180px;
      margin: 0 auto;
      padding: 0 24px;
    }
    .mad-universe-kicker {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #7dd3fc;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      line-height: 1;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .mad-universe-kicker span { color: #38bdf8; }
    .mad-universe-marquee {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
      mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
    }
    .mad-universe-track {
      display: flex;
      align-items: center;
      gap: 36px;
      width: max-content;
      animation: madUniverseScroll 44s linear infinite;
    }
    .mad-universe-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: max-content;
      opacity: 0.78;
      text-decoration: none;
      transition: opacity 160ms ease, transform 160ms ease;
    }
    .mad-universe-link:hover { opacity: 1; transform: translateY(-1px); }
    .mad-universe-link img {
      display: block;
      width: auto;
      max-width: 168px;
      height: 24px;
      object-fit: contain;
      filter: drop-shadow(0 0 12px rgba(255,255,255,0.08));
    }
    .mad-universe-text {
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
      line-height: 1;
      text-transform: uppercase;
      white-space: nowrap;
    }
    @keyframes madUniverseScroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    @media (max-width: 760px) {
      .mad-universe-inner {
        align-items: stretch;
        flex-direction: column;
        gap: 12px;
        padding: 0 18px;
      }
      .mad-universe-kicker { justify-content: center; }
      .mad-universe-track { gap: 28px; animation-duration: 52s; }
      .mad-universe-link img { height: 20px; max-width: 142px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mad-universe-track {
        animation: none;
        flex-wrap: wrap;
        justify-content: center;
        width: auto;
      }
      .mad-universe-marquee {
        -webkit-mask-image: none;
        mask-image: none;
      }
    }
  `],
  template: `
  <mc-marketing-header />

  <!-- ════════════════════════════════════ HERO ════════════════════════════════════ -->
  <section class="relative min-h-[92vh] flex items-center overflow-hidden">
    <div class="absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full bg-brand/[0.08] blur-[160px] pointer-events-none animate-float"></div>
    <div class="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-accent/[0.07] blur-[140px] pointer-events-none animate-float" style="animation-delay:-3.5s"></div>
    <div class="absolute inset-0 mc-grid-bg opacity-[0.14] pointer-events-none [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,black,transparent)]"></div>

    <div class="relative w-full max-w-6xl mx-auto px-6 py-36 text-center">

      <div class="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/25 text-xs font-bold tracking-[0.15em] text-brand uppercase mb-8 animate-fade-in">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-60"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
        </span>
        AI-native &nbsp;·&nbsp; Multi-tenant &nbsp;·&nbsp; White-label ready
      </div>

      <h1 class="mc-heading text-6xl sm:text-7xl md:text-[90px] font-black tracking-tight leading-[1.01] animate-fade-up">
        Generate entire
        <br class="hidden md:block" />
        <span class="bg-gradient-to-r from-brand via-fuchsia-400 to-accent bg-clip-text text-transparent">
          websites in minutes.
        </span>
      </h1>

      <p class="mt-7 max-w-2xl mx-auto text-xl text-fg-muted leading-relaxed animate-fade-up" style="animation-delay:.10s">
        MADCreate is the AI platform agencies use to onboard clients, generate
        production-ready websites and business systems, and deploy them —
        all in a single afternoon.
      </p>

      <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style="animation-delay:.18s">
        <a routerLink="/register" class="mc-btn-primary !px-8 !py-4 text-base shadow-glow group">
          Generate my first site
          <span class="group-hover:translate-x-1 transition-transform duration-200 inline-block">→</span>
        </a>
        <a [routerLink]="[]" [fragment]="'pricing'" class="mc-btn-secondary !px-8 !py-4 text-base">
          View pricing
        </a>
        <a routerLink="/demo" class="mc-btn-ghost !px-6 !py-4 text-base">
          <i class="fa-solid fa-play text-brand text-xs mr-1"></i>
          Watch demo
        </a>
      </div>

      <div class="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-fg-subtle animate-fade-up" style="animation-delay:.24s">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-accent"></i> No credit card required</span>
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-accent"></i> Free forever plan</span>
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-accent"></i> Cancel anytime</span>
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-accent"></i> ZAR pricing</span>
      </div>

      <div class="mt-16 inline-grid grid-cols-3 divide-x divide-white/8 bg-surface-raised border border-white/8 rounded-xl overflow-hidden animate-fade-up" style="animation-delay:.30s">
        @for (s of heroStats; track s.label) {
          <div class="px-8 py-5 text-center">
            <div class="mc-heading text-2xl font-black bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">{{ s.value }}</div>
            <div class="text-xs text-fg-muted mt-1 leading-tight">{{ s.label }}</div>
          </div>
        }
      </div>
    </div>
  </section>

  <!-- ════════════════════════════════ TICKER ════════════════════════════════ -->
  <section class="mad-universe-strip" aria-label="Explore the MAD universe">
    <div class="mad-universe-inner">
      <p class="mad-universe-kicker"><span aria-hidden="true">*</span> The MAD universe</p>
      <div class="mad-universe-marquee">
        <div class="mad-universe-track">
          @for (app of madUniverseApps.concat(madUniverseApps); track app.name + $index) {
            <a class="mad-universe-link" [href]="app.url" target="_blank" rel="noopener" [attr.aria-label]="app.name">
              @if (app.logo) {
                <img [src]="app.logo" [alt]="app.name" loading="lazy" decoding="async" />
              } @else {
                <span class="mad-universe-text">{{ app.name }}</span>
              }
            </a>
          }
        </div>
      </div>
    </div>
  </section>

  <div class="relative py-3.5 border-y border-white/5 overflow-hidden bg-surface-raised">
    <div class="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-surface-raised to-transparent z-10 pointer-events-none"></div>
    <div class="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface-raised to-transparent z-10 pointer-events-none"></div>
    <div class="mc-marquee flex gap-10 whitespace-nowrap">
      @for (item of tickerItems; track item) {
        <span class="inline-flex items-center gap-2.5 text-sm font-medium text-fg-muted">
          <span class="text-brand text-[10px]">✦</span>{{ item }}
        </span>
      }
      @for (item of tickerItems; track item + 'dup') {
        <span class="inline-flex items-center gap-2.5 text-sm font-medium text-fg-muted">
          <span class="text-brand text-[10px]">✦</span>{{ item }}
        </span>
      }
    </div>
  </div>

  <!-- ════════════════════════ HOW IT WORKS ════════════════════════ -->
  <section class="relative py-28 border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-20 max-w-xl mx-auto">
        <span class="mc-eyebrow">How it works</span>
        <h2 class="mc-heading text-4xl md:text-5xl font-bold mt-3">
          From prompt to live site <span class="text-fg-muted">in four steps.</span>
        </h2>
      </div>
      <div class="grid md:grid-cols-4 gap-6 relative">
        <div class="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-brand/20 via-accent/30 to-brand/20"></div>
        @for (step of steps; track step.n) {
          <div class="flex flex-col items-center text-center group">
            <div class="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-fuchsia-700 flex items-center justify-center text-white text-xl font-black shadow-glow mb-5 transition-transform duration-300 group-hover:scale-110">
              {{ step.n }}
            </div>
            <h3 class="mc-heading text-lg font-bold mb-2">{{ step.title }}</h3>
            <p class="text-sm text-fg-muted leading-relaxed">{{ step.body }}</p>
          </div>
        }
      </div>
    </div>
  </section>

  <!-- ════════════════════════════ FEATURES ════════════════════════════ -->
  <section class="relative py-28 border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-20 max-w-xl mx-auto">
        <span class="mc-eyebrow">Platform capabilities</span>
        <h2 class="mc-heading text-4xl md:text-5xl font-bold mt-3">
          One platform. <span class="text-fg-muted">Every site you'll ever ship.</span>
        </h2>
      </div>
      <div class="grid md:grid-cols-3 gap-5">
        @for (f of features; track f.title) {
          <div class="mc-card-hover p-7 group">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5 transition-transform duration-300 group-hover:scale-110"
                 [ngStyle]="{'background': f.iconBg, 'color': f.iconColor}"
                 [innerHTML]="f.icon">
            </div>
            <h3 class="mc-heading text-lg font-bold mb-2">{{ f.title }}</h3>
            <p class="text-sm text-fg-muted leading-relaxed">{{ f.body }}</p>
          </div>
        }
      </div>
    </div>
  </section>

  <!-- ════════════════════════════ SHOWCASE ════════════════════════════ -->
  <section id="showcase" class="relative py-28 border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-20 max-w-xl mx-auto">
        <span class="mc-eyebrow">What you can build</span>
        <h2 class="mc-heading text-4xl md:text-5xl font-bold mt-3">
          Any industry. <span class="text-fg-muted">Any site. One platform.</span>
        </h2>
      </div>
      <div class="grid md:grid-cols-3 gap-5">
        @for (s of showcase; track s.title) {
          <div class="mc-card-hover overflow-hidden group cursor-pointer">
            <div class="aspect-[16/9] relative overflow-hidden">
              <div class="absolute inset-0 transition-transform duration-500 group-hover:scale-110" [style.background]="s.gradient"></div>
              <div class="absolute inset-0 mc-grid-bg opacity-20"></div>
              <div class="absolute inset-0 flex items-center justify-center text-5xl opacity-90" [innerHTML]="s.icon"></div>
              <div class="absolute top-3 right-3">
                <span class="mc-chip !text-[10px] !px-2 !py-0.5">{{ s.tag }}</span>
              </div>
            </div>
            <div class="p-5">
              <h3 class="mc-heading font-bold mb-1.5">{{ s.title }}</h3>
              <p class="text-xs text-fg-muted leading-relaxed">{{ s.body }}</p>
            </div>
          </div>
        }
      </div>
      <div class="text-center mt-10">
        <a routerLink="/demo" class="mc-btn-secondary !px-6 !py-3 text-sm">
          Open the live demo tenant <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  </section>

  <!-- ════════════════════════════ PRICING ════════════════════════════ -->
  <section id="pricing" class="relative py-28 border-t border-white/5 overflow-hidden">
    <div class="absolute inset-0 bg-aurora opacity-15 pointer-events-none"></div>
    <div class="absolute inset-0 mc-grid-bg opacity-[0.08] pointer-events-none [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]"></div>

    <div class="max-w-6xl mx-auto px-6 relative">
      <div class="text-center mb-14 max-w-xl mx-auto">
        <span class="mc-eyebrow">Pricing</span>
        <h2 class="mc-heading text-4xl md:text-5xl font-bold mt-3">
          Simple, transparent <span class="text-fg-muted">pricing.</span>
        </h2>
        <p class="mt-4 text-fg-muted">Start free. Scale as you grow. No hidden fees, no surprises.</p>
      </div>

      <!-- Billing toggle -->
      <div class="flex items-center justify-center gap-3 mb-12">
        <span class="text-sm" [class.text-fg]="!annualBilling()" [class.text-fg-muted]="annualBilling()">Monthly</span>
        <button type="button" role="switch"
          class="relative w-12 h-6 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          [class.bg-brand]="annualBilling()"
          [class.bg-surface-subtle]="!annualBilling()"
          [attr.aria-checked]="annualBilling()"
          (click)="annualBilling.set(!annualBilling())">
          <span class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                [class.translate-x-6]="annualBilling()">
          </span>
        </button>
        <span class="text-sm flex items-center gap-2"
              [class.text-fg]="annualBilling()" [class.text-fg-muted]="!annualBilling()">
          Annual
          <span class="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-black tracking-widest">SAVE 25%</span>
        </span>
      </div>

      <!-- Cards -->
      <div class="grid md:grid-cols-3 gap-6 items-start">
        @for (plan of plans; track plan.name) {
          <div class="mc-card p-8 relative flex flex-col h-full transition-transform duration-300 hover:-translate-y-1"
               [class.pricing-featured]="plan.featured">

            @if (plan.featured) {
              <div class="absolute -top-4 left-0 right-0 flex justify-center">
                <span class="px-5 py-1 rounded-full text-xs font-black tracking-wider text-white"
                      style="background: linear-gradient(90deg, #C026D3, #9333ea)">
                  ✦ MOST POPULAR
                </span>
              </div>
            }

            <div class="mb-6 mt-2">
              <div class="text-xs font-black tracking-[0.2em] uppercase mb-3"
                   [class.text-brand]="plan.featured"
                   [class.text-fg-muted]="!plan.featured">
                {{ plan.name }}
              </div>
              <div class="flex items-end gap-1.5 mb-1">
                @if (plan.price === 0) {
                  <span class="mc-heading text-5xl font-black">Free</span>
                  <span class="text-fg-muted text-sm mb-1.5">forever</span>
                } @else {
                  <span class="text-fg-muted text-lg mb-2.5">R</span>
                  <span class="mc-heading text-5xl font-black">{{ annualBilling() ? plan.annualPrice : plan.price }}</span>
                  <span class="text-fg-muted text-sm mb-1.5">/mo</span>
                }
              </div>
              @if (plan.price > 0) {
                <p class="text-xs text-fg-subtle">
                  @if (annualBilling()) {
                    Billed as R{{ plan.annualPrice * 12 | number }}/year
                  } @else {
                    Save R{{ (plan.price - plan.annualPrice) * 12 | number }}/year on annual
                  }
                </p>
              }
              <p class="mt-3 text-sm text-fg-muted leading-relaxed">{{ plan.description }}</p>
            </div>

            <a [routerLink]="plan.price === 0 ? '/register' : (plan.name === 'Enterprise' ? '/contact' : '/register')"
               class="w-full text-center mb-8 block"
               [class.mc-btn-primary]="plan.featured"
               [class.shadow-glow]="plan.featured"
               [class.mc-btn-secondary]="!plan.featured">
              {{ plan.cta }}
            </a>

            <ul class="space-y-3 flex-1">
              @for (feat of plan.features; track feat) {
                <li class="flex items-start gap-3 text-sm">
                  <i class="fa-solid fa-circle-check mt-0.5 flex-shrink-0" [class.text-accent]="plan.featured" [class.text-fg-muted]="!plan.featured"></i>
                  <span class="text-fg-muted">{{ feat }}</span>
                </li>
              }
            </ul>
          </div>
        }
      </div>

      <p class="text-center mt-8 text-xs text-fg-subtle">
        All plans include SSL, daily backups and 99.9% uptime. Prices in ZAR, excl. VAT.
        <a routerLink="/contact" class="text-brand hover:underline ml-1">Need a custom quote?</a>
      </p>
    </div>
  </section>

  <!-- ════════════════════════ WHO IT'S FOR ════════════════════════ -->
  <section class="py-24 border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6">
      <div class="text-center mb-16 max-w-xl mx-auto">
        <span class="mc-eyebrow">Built for</span>
        <h2 class="mc-heading text-4xl md:text-5xl font-bold mt-3">
          Whether you're solo <span class="text-fg-muted">or leading a 50-person agency.</span>
        </h2>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        @for (u of useCases; track u.title) {
          <div class="mc-card p-7 group hover:border-brand/20 transition-all duration-300 hover:-translate-y-0.5">
            <div class="w-10 h-10 rounded-lg mb-4 flex items-center justify-center text-lg"
                 style="background: rgb(192 38 211 / 0.10); color: #C026D3"
                 [innerHTML]="u.icon">
            </div>
            <h3 class="mc-heading text-base font-bold mb-2">{{ u.title }}</h3>
            <p class="text-xs text-fg-muted leading-relaxed">{{ u.body }}</p>
          </div>
        }
      </div>
    </div>
  </section>

  <!-- ════════════════════════ STATS ════════════════════════ -->
  <section class="py-20 border-t border-white/5">
    <div class="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-5 text-center">
      @for (s of stats; track s.label) {
        <div class="mc-card p-7">
          <div class="mc-heading text-4xl font-black bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">{{ s.value }}</div>
          <div class="text-sm text-fg-muted mt-2">{{ s.label }}</div>
        </div>
      }
    </div>
  </section>

  <!-- ════════════════════════ FAQ ════════════════════════ -->
  <section id="faq" class="py-24 border-t border-white/5">
    <div class="max-w-3xl mx-auto px-6">
      <div class="text-center mb-14">
        <span class="mc-eyebrow">FAQ</span>
        <h2 class="mc-heading text-4xl font-bold mt-3">Questions, answered.</h2>
      </div>
      <div class="space-y-3">
        @for (q of faqs; track q.q) {
          <details class="mc-card p-5 group">
            <summary class="cursor-pointer list-none flex items-start justify-between gap-4">
              <span class="mc-heading font-semibold text-sm leading-snug">{{ q.q }}</span>
              <i class="fa-solid fa-plus text-brand flex-shrink-0 mt-0.5 transition-transform duration-200 group-open:rotate-45"></i>
            </summary>
            <p class="mt-3 text-sm text-fg-muted leading-relaxed">{{ q.a }}</p>
          </details>
        }
      </div>
    </div>
  </section>

  <!-- ════════════════════════ FINAL CTA ════════════════════════ -->
  <section class="py-32 border-t border-white/5 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute inset-0 bg-aurora opacity-25"></div>
      <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-brand/[0.10] blur-[120px]"></div>
      <div class="absolute inset-0 mc-grid-bg opacity-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>
    </div>
    <div class="relative max-w-4xl mx-auto px-6 text-center">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold tracking-widest uppercase mb-8">
        <i class="fa-solid fa-bolt text-[10px]"></i> Ready to build?
      </div>
      <h2 class="mc-heading text-5xl md:text-7xl font-black leading-tight mb-6">
        Your next client site,<br />
        <span class="bg-gradient-to-r from-brand via-fuchsia-400 to-accent bg-clip-text text-transparent">
          generated in minutes.
        </span>
      </h2>
      <p class="text-xl text-fg-muted max-w-xl mx-auto mb-10 leading-relaxed">
        No templates. No drag-and-drop guesswork. Just AI-generated,
        production-ready websites that impress clients from day one.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a routerLink="/register" class="mc-btn-primary !px-10 !py-4 text-lg shadow-glow group">
          Generate my first site
          <span class="group-hover:translate-x-1 transition-transform inline-block">→</span>
        </a>
        <a routerLink="/contact" class="mc-btn-ghost !px-8 !py-4 text-base">
          Talk to sales
        </a>
      </div>
      <p class="mt-6 text-xs text-fg-subtle">
        Free plan available · No credit card · Up and running in under 5 minutes
      </p>
    </div>
  </section>

  <mc-marketing-footer />
  `,
})
export class LandingPage {
  protected readonly madUniverseApps = MAD_UNIVERSE_APPS;
  protected readonly annualBilling = signal(false);

  protected readonly heroStats = [
    { value: '10×',  label: 'faster client onboarding' },
    { value: '28',   label: 'Prisma models, production-ready' },
    { value: '0 min', label: 'until first site preview' },
  ];

  protected readonly tickerItems = [
    'Boutique services', 'SaaS portals', 'Restaurant sites', 'Real estate agencies',
    'Law firms', 'E-commerce stores', 'Gym & wellness', 'Accounting practices',
    'Event platforms', 'Medical practices', 'Coaching businesses', 'Recruitment portals',
    'Church platforms', 'Education portals', 'Franchise systems', 'Tech startups',
  ];

  protected readonly steps = [
    { n: 1, title: 'Onboard',  body: 'Fill a 5-question wizard — business name, niche, colours, goals, audience. 90 seconds flat.' },
    { n: 2, title: 'Generate', body: 'AI produces a complete site schema: pages, sections, copy, theme tokens and SEO — all in one pass.' },
    { n: 3, title: 'Refine',   body: 'Drop into the visual builder. Drag, edit, rearrange. Or just leave it — it ships beautifully as-is.' },
    { n: 4, title: 'Publish',  body: 'One click to deploy. Subdomain in seconds, custom domain in minutes, SSL auto-provisioned.' },
  ];

  protected readonly features = [
    { icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>', iconBg: 'rgb(192 38 211 / 0.12)', iconColor: '#C026D3',
      title: 'AI generation engine',
      body: 'JSON-first, schema-driven generation. Pages, sections, copy, palettes and SEO — built from a prompt, editable in the builder.' },
    { icon: '<i class="fa-solid fa-layer-group"></i>', iconBg: 'rgb(163 230 53 / 0.12)', iconColor: '#A3E635',
      title: 'True multi-tenancy',
      body: 'Each client gets isolated data, theme, domain and AI quota. Run hundreds of tenants from a single platform.' },
    { icon: '<i class="fa-solid fa-globe"></i>', iconBg: 'rgb(192 38 211 / 0.12)', iconColor: '#C026D3',
      title: 'Custom domains & SSL',
      body: 'CNAME, A-record or wildcard. DNS verification baked in. Cloudflare-ready with auto-issued Let\'s Encrypt certs per tenant.' },
    { icon: '<i class="fa-solid fa-puzzle-piece"></i>', iconBg: 'rgb(163 230 53 / 0.12)', iconColor: '#A3E635',
      title: 'Integration catalog',
      body: 'Stripe, PayFast, WhatsApp, Xero, Calendly and more — installable per tenant without touching code.' },
    { icon: '<i class="fa-solid fa-palette"></i>', iconBg: 'rgb(192 38 211 / 0.12)', iconColor: '#C026D3',
      title: 'Visual builder',
      body: 'Live drag-and-drop section editing with real-time previews. No build step, no surprises, no dev skills required.' },
    { icon: '<i class="fa-solid fa-chart-line"></i>', iconBg: 'rgb(163 230 53 / 0.12)', iconColor: '#A3E635',
      title: 'Analytics & audit',
      body: 'First-party pageview ingestion, per-tenant dashboards and a tamper-evident audit log. Your data, on your infrastructure.' },
  ];

  protected readonly showcase = [
    { title: 'Professional services',    body: 'Law, accounting, consulting. Trust-first design with case studies, team bios and lead capture.', icon: '<i class="fa-solid fa-scale-balanced"></i>', tag: 'Live demo',   gradient: 'linear-gradient(135deg,#C026D3 0%,#7c3aed 100%)' },
    { title: 'Hospitality & food',       body: 'Restaurant menus, reservations, galleries, locations. Multi-language, PayFast and WhatsApp wired.', icon: '<i class="fa-solid fa-utensils"></i>',      tag: 'Coming soon', gradient: 'linear-gradient(135deg,#f97316 0%,#C026D3 100%)' },
    { title: 'Health & wellness',        body: 'Gym, physio, coaching. Booking flows, testimonials, pricing tables, WhatsApp intake forms.', icon: '<i class="fa-solid fa-heart-pulse"></i>',    tag: 'Coming soon', gradient: 'linear-gradient(135deg,#A3E635 0%,#0fb5ba 100%)' },
    { title: 'Local retail / e-commerce',body: 'Product catalog, Stripe/PayFast checkout, inventory management and order tracking.', icon: '<i class="fa-solid fa-store"></i>',           tag: 'Coming soon', gradient: 'linear-gradient(135deg,#facc15 0%,#f97316 100%)' },
    { title: 'SaaS & tech startups',     body: 'Marketing site + gated portal. Multi-tenant from day one, billing-ready and API-first.', icon: '<i class="fa-solid fa-laptop-code"></i>',    tag: 'Coming soon', gradient: 'linear-gradient(135deg,#38bdf8 0%,#818cf8 100%)' },
    { title: 'Community & faith',        body: 'Church, NPO, clubs. Events, sermons, donations, prayer wall. PayFast and WhatsApp integrated.', icon: '<i class="fa-solid fa-people-group"></i>',  tag: 'Coming soon', gradient: 'linear-gradient(135deg,#C026D3 0%,#A3E635 100%)' },
  ];

  protected readonly useCases = [
    { icon: '<i class="fa-solid fa-bolt"></i>',      title: 'Agencies',     body: 'Onboard any client in 30 minutes. White-label the entire platform. Bill per tenant or by seat.' },
    { icon: '<i class="fa-solid fa-user"></i>',      title: 'Freelancers',  body: 'Ship premium sites 10× faster. Spend saved time on strategy and creative instead of repetitive builds.' },
    { icon: '<i class="fa-solid fa-building"></i>',  title: 'SMEs',         body: 'Serious online presence without a dev team. Add pages in a click, ship a redesign in an hour.' },
    { icon: '<i class="fa-solid fa-handshake"></i>', title: 'Resellers',    body: 'Run a hosting + generation business on MADCreate. Custom domains, tenant isolation and billing all handled.' },
  ];

  protected readonly plans = [
    {
      name: 'Starter',
      price: 0,
      annualPrice: 0,
      featured: false,
      description: 'Everything you need to validate your first client site — no card required.',
      cta: 'Get started free',
      features: [
        '1 workspace (tenant)',
        '10 AI generations per month',
        'Subdomain hosting (*.madcreate.site)',
        'Visual builder access',
        'Basic analytics',
        'Community support',
      ],
    },
    {
      name: 'Agency',
      price: 799,
      annualPrice: 599,
      featured: true,
      description: 'For freelancers and agencies ready to scale client delivery to the next level.',
      cta: 'Start 14-day free trial',
      features: [
        '25 workspaces (tenants)',
        '250 AI generations per month',
        'Custom domains + auto-SSL per tenant',
        'Full visual builder',
        'Integration catalog (Stripe, PayFast, WhatsApp)',
        'Advanced analytics & audit log',
        'White-label for your clients',
        'Priority email support',
      ],
    },
    {
      name: 'Enterprise',
      price: 2499,
      annualPrice: 1874,
      featured: false,
      description: 'Unlimited scale, full white-labelling and a dedicated success partner.',
      cta: 'Talk to sales',
      features: [
        'Unlimited workspaces',
        '2 000 AI generations per month',
        'Full white-label (zero MADCreate branding)',
        'REST API + webhooks',
        'SSO / SAML support',
        'SLA with 4-hour response',
        'Dedicated onboarding manager',
        'Custom AI prompt templates',
      ],
    },
  ];

  protected readonly stats = [
    { value: '10×',  label: 'faster client launches' },
    { value: '100s', label: 'of tenants per platform' },
    { value: '28',   label: 'Prisma models, fully relational' },
    { value: '0 hr', label: 'until first site preview' },
  ];

  protected readonly faqs = [
    {
      q: 'Do I need to know how to code?',
      a: 'No. The onboarding wizard and AI generator produce a complete, deployable site from a 5-question form. The visual builder lets you refine without touching code. Developers can still extend the Angular + NestJS + Prisma stack if they want to.',
    },
    {
      q: 'How is this different from Wix, Webflow or Squarespace?',
      a: 'MADCreate is a multi-tenant platform first, a site builder second. You\'re not building one site — you\'re running a website-generation business. Every tenant is fully isolated with their own theme, domain, AI quota and billing. Wix can\'t do that.',
    },
    {
      q: 'Can I bring my own domain for each client?',
      a: 'Yes. Add the domain, point the CNAME or A-record to the platform, and SSL auto-provisions via Cloudflare or Let\'s Encrypt. The tenant resolver routes by Host header — no per-tenant manual server config needed.',
    },
    {
      q: 'What does the Agency plan\'s white-label cover?',
      a: 'Your clients see your brand, your domain, your colours. The login page, dashboard, emails and billing pages all carry your identity. MADCreate is completely invisible to your clients.',
    },
    {
      q: 'Where is the data hosted?',
      a: 'You control the server. MADCreate ships a deploy script that puts everything on your own DreamCompute, DigitalOcean, or AWS instance. Your data never touches our systems.',
    },
    {
      q: 'What happens if I cancel?',
      a: 'You keep full access until the end of your billing period. After that, free-plan limits apply. Your data and tenant sites are never deleted — you can export or downgrade without losing anything.',
    },
  ];
}
