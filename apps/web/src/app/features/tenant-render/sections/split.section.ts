import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';


export interface SplitCtaProps {
  href?: string;
  label?: string;
}

export interface SplitSectionProps {
  heading?: string;
  body?: string;
  cta?: SplitCtaProps;
  mediaUrl?: string;
}

@Component({
  selector: 'mc-split-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
      <div>
        @if (props?.heading) {
          <h2 class="mc-heading text-3xl font-bold mb-4">{{ props.heading }}</h2>
        }
        @if (props?.body) {
          <p class="text-fg-muted leading-relaxed mb-6">{{ props.body }}</p>
        }
        @if (props?.cta) {
          <a [href]="props.cta?.href || '#'" class="mc-btn-primary !px-6 !py-3">
            {{ props.cta?.label }}
          </a>
        }
      </div>
      <div class="aspect-video rounded-lg overflow-hidden bg-surface-subtle">
        @if (props?.mediaUrl) {
          <img [src]="props.mediaUrl" alt="" class="w-full h-full object-cover" />
        } @else {
          <div class="w-full h-full grid place-items-center text-fg-subtle text-sm">Media</div>
        }
      </div>
    </div>
  </section>
  `,
})
export class SplitSection { @Input() props: SplitSectionProps = {}; }
