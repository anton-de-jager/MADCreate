import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HeroCtaProps {
  label?: string;
  href?: string;
}

export interface HeroSectionProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  primaryCta?: HeroCtaProps;
  secondaryCta?: HeroCtaProps;
}

@Component({
  selector: 'mc-hero-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="relative px-6 py-24 md:py-32 text-center overflow-hidden">
    <div class="absolute inset-0 bg-aurora opacity-50 pointer-events-none"></div>
    <div class="relative max-w-4xl mx-auto">
      @if (props?.eyebrow) {
        <span class="mc-eyebrow">{{ props.eyebrow }}</span>
      }
      <h1 class="mc-heading text-4xl md:text-6xl font-extrabold tracking-tight mt-3 animate-fade-up">
        {{ props?.heading }}
      </h1>
      @if (props?.subheading) {
        <p class="mt-5 text-lg text-fg-muted max-w-2xl mx-auto animate-fade-up">{{ props.subheading }}</p>
      }
      <div class="mt-8 flex items-center justify-center gap-3 flex-wrap animate-fade-up">
        @if (props?.primaryCta) {
          <a [href]="props.primaryCta?.href || '#'" class="mc-btn-primary !px-6 !py-3 text-base">
            {{ props.primaryCta?.label }}
          </a>
        }
        @if (props?.secondaryCta) {
          <a [href]="props.secondaryCta?.href || '#'" class="mc-btn-secondary !px-6 !py-3 text-base">
            {{ props.secondaryCta?.label }}
          </a>
        }
      </div>
    </div>
  </section>
  `,
})
export class HeroSection {
  @Input() props: HeroSectionProps = {};
}
