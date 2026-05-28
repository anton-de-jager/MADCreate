import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarketingHeader } from '../shared/marketing-header.component';
import { MarketingFooter } from '../shared/marketing-footer.component';
import { ApiService } from '../../../core/services/api.service';
import { PayfastSubscribeComponent } from '../../../shared/payfast/payfast-subscribe.component';

interface Plan {
  id: string; code: string; name: string; description?: string;
  priceMonthlyUsd: string; priceAnnualUsd: string;
  features: string[]; limits: Record<string, number>;
  trialDays: number; isPublic: boolean; sortOrder: number;
}

@Component({
  selector: 'mc-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink, MarketingHeader, MarketingFooter, PayfastSubscribeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <mc-marketing-header />
  <section class="max-w-6xl mx-auto px-6 pt-24 pb-12 text-center">
    <span class="mc-eyebrow">Pricing</span>
    <h1 class="mc-heading text-5xl md:text-6xl font-bold mt-3">Built for scale.<br/><span class="text-fg-muted">Priced for growth.</span></h1>
    <p class="mt-4 text-fg-muted max-w-xl mx-auto">Pick a plan that fits where you are now. Upgrade as your tenants grow.</p>
  </section>

  <section class="max-w-6xl mx-auto px-6 pb-24">
    @if (loading()) {
      <div class="text-center text-fg-muted py-12">Loading plans…</div>
    } @else if (error()) {
      <div class="mc-card p-6 text-center">
        <p class="text-fg-muted">Could not load plans — the API may not be running.</p>
        <p class="text-xs text-fg-subtle mt-2">{{ error() }}</p>
      </div>
    } @else {
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        @for (plan of plans(); track plan.id) {
          <div class="mc-card-hover p-6 flex flex-col"
               [class.shadow-glow]="plan.code === 'growth'"
               [class.border-brand!]="plan.code === 'growth'">
            <div class="flex items-center justify-between">
              <h3 class="mc-heading text-xl font-semibold">{{ plan.name }}</h3>
              @if (plan.code === 'growth') { <span class="mc-chip">Most popular</span> }
            </div>
            <p class="text-sm text-fg-muted mt-1 min-h-[2.5rem]">{{ plan.description }}</p>
            <div class="mt-4 flex items-baseline gap-1">
              <span class="mc-heading text-4xl font-extrabold">{{ formatPrice(plan.priceMonthlyUsd) }}</span>
              <span class="text-sm text-fg-subtle">/ mo</span>
            </div>
            <ul class="mt-4 space-y-1.5 text-sm flex-1">
              @for (f of plan.features; track f) {
                <li class="flex items-center gap-2 text-fg-muted"><span class="text-brand"><i class="fa-solid fa-check"></i></span> {{ formatFeature(f) }}</li>
              }
            </ul>
            <a [routerLink]="'/register'" [queryParams]="{ plan: plan.code }"
               class="mt-6"
               [class.mc-btn-primary]="plan.code === 'growth'"
               [class.mc-btn-secondary]="plan.code !== 'growth'">
              {{ plan.trialDays > 0 ? 'Start ' + plan.trialDays + '-day trial' : 'Get started' }}
            </a>
          </div>
        }
      </div>
    }
  </section>
  <section class="max-w-6xl mx-auto px-6 pb-16">
    <app-payfast-subscribe productName="MADCreate" headline="Subscribe without leaving MADCreate" lead="Pick a plan and open the secure onsite Payfast checkout modal from this page." [compact]="true"></app-payfast-subscribe>
  </section>
  <mc-marketing-footer />
  `,
})
export class PricingPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    this.api.get<Plan[]>('/billing/plans').subscribe({
      next: (p) => { this.plans.set(p.filter((x) => x.isPublic).sort((a, b) => a.sortOrder - b.sortOrder)); this.loading.set(false); },
      error: (e) => { this.error.set(e.message ?? 'Unknown error'); this.loading.set(false); },
    });
  }

  protected formatPrice(usd: string): string {
    const n = Number(usd);
    return n === 0 ? '$0' : `$${n}`;
  }
  protected formatFeature(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
