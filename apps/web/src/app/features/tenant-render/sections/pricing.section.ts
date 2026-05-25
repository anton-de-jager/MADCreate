import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PricingCtaProps {
  label?: string;
  href?: string;
}

export interface PricingTierProps {
  name?: string;
  price?: string;
  interval?: string;
  description?: string;
  highlighted?: boolean;
  features?: string[];
  cta?: PricingCtaProps;
}

export interface PricingSectionProps {
  heading?: string;
  subheading?: string;
  tiers?: PricingTierProps[];
}

@Component({
  selector: 'mc-pricing-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-6xl mx-auto text-center mb-12">
      <h2 class="mc-heading text-3xl md:text-5xl font-bold">{{ props?.heading }}</h2>
      @if (props?.subheading) { <p class="mt-3 text-fg-muted">{{ props.subheading }}</p> }
    </div>
    <div class="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
      @for (tier of (props?.tiers ?? []); track tier.name) {
        <div class="mc-card p-6" [class.shadow-glow]="tier.highlighted" [class.border-brand]="tier.highlighted">
          <div class="mc-heading text-xl font-semibold">{{ tier.name }}</div>
          <div class="mt-3 flex items-baseline gap-1">
            <span class="mc-heading text-4xl font-extrabold">{{ tier.price }}</span>
            @if (tier.interval) { <span class="text-fg-subtle text-sm">/ {{ tier.interval }}</span> }
          </div>
          @if (tier.description) { <p class="mt-2 text-sm text-fg-muted">{{ tier.description }}</p> }
          <ul class="mt-5 space-y-1.5 text-sm">
            @for (f of (tier.features ?? []); track f) {
              <li class="flex items-center gap-2 text-fg-muted"><span class="text-brand"><i class="fa-solid fa-check"></i></span>{{ f }}</li>
            }
          </ul>
          @if (tier.cta) {
            <a [href]="tier.cta.href || '#'"
               class="mt-6 block text-center"
               [class.mc-btn-primary]="tier.highlighted"
               [class.mc-btn-secondary]="!tier.highlighted">{{ tier.cta.label }}</a>
          }
        </div>
      }
    </div>
  </section>
  `,
})
export class PricingSection { @Input() props: PricingSectionProps = {}; }
