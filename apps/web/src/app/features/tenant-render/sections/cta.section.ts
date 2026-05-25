import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CtaSectionAction {
  label?: string;
  href?: string;
}

export interface CtaSectionProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  cta?: CtaSectionAction;
  secondaryCta?: CtaSectionAction;
}

@Component({
  selector: 'mc-cta-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-24 text-center relative overflow-hidden">
    <div class="absolute inset-0 bg-aurora opacity-40 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>
    @if (props?.eyebrow) { <div class="mc-eyebrow mb-2">{{ props.eyebrow }}</div> }
    <h2 class="mc-heading text-3xl md:text-5xl font-bold max-w-3xl mx-auto">{{ props?.heading }}</h2>
    @if (props?.subheading) { <p class="mt-4 text-fg-muted max-w-xl mx-auto">{{ props.subheading }}</p> }
    <div class="mt-8 flex items-center justify-center gap-3">
      @if (props?.cta) {
        <a [href]="props.cta?.href || '#'" class="mc-btn-primary !px-6 !py-3 text-base">{{ props.cta?.label }}</a>
      }
      @if (props?.secondaryCta) {
        <a [href]="props.secondaryCta?.href || '#'" class="mc-btn-ghost !px-6 !py-3 text-base">{{ props.secondaryCta?.label }}</a>
      }
    </div>
  </section>
  `,
})
export class CtaSection { @Input() props: CtaSectionProps = {}; }
