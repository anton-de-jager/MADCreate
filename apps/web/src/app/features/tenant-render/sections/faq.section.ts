import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FaqSectionItem {
  question?: string;
  answer?: string;
}

export interface FaqSectionProps {
  heading?: string;
  items?: FaqSectionItem[];
}

@Component({
  selector: 'mc-faq-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-3xl mx-auto">
      <h2 class="mc-heading text-3xl md:text-4xl font-bold text-center mb-10">{{ props?.heading || 'FAQ' }}</h2>
      <div class="space-y-3">
        @for (it of (props?.items ?? []); track $index) {
          <details class="mc-card p-5 group">
            <summary class="cursor-pointer font-medium flex items-center justify-between">
              <span>{{ it.question }}</span>
              <span class="text-fg-subtle group-open:rotate-45 transition-transform"><i class="fa-solid fa-plus"></i></span>
            </summary>
            <p class="text-sm text-fg-muted mt-3">{{ it.answer }}</p>
          </details>
        }
      </div>
    </div>
  </section>
  `,
})
export class FaqSection { @Input() props: FaqSectionProps = {}; }
