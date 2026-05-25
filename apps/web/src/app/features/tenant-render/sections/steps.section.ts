import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StepsSectionItem {
  n?: number;
  title?: string;
  body?: string;
}

export interface StepsSectionProps {
  heading?: string;
  items?: StepsSectionItem[];
}

@Component({
  selector: 'mc-steps-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-4xl mx-auto">
      @if (props?.heading) {
        <h2 class="mc-heading text-3xl font-bold text-center mb-12">{{ props.heading }}</h2>
      }
      <div class="space-y-8">
        @for (it of (props?.items ?? []); track $index) {
          <div class="flex gap-6 items-start">
            <div class="shrink-0 w-10 h-10 rounded-full bg-brand/10 grid place-items-center text-brand font-bold">
              {{ it.n ?? ($index + 1) }}
            </div>
            <div>
              <h3 class="font-semibold text-lg mb-1">{{ it.title }}</h3>
              <p class="text-sm text-fg-muted leading-relaxed">{{ it.body }}</p>
            </div>
          </div>
        }
      </div>
    </div>
  </section>
  `,
})
export class StepsSection { @Input() props: StepsSectionProps = {}; }
