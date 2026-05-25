import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TestimonialItemProps {
  quote?: string;
  author?: string;
  role?: string;
}

export interface TestimonialsSectionProps {
  heading?: string;
  items?: TestimonialItemProps[];
}

@Component({
  selector: 'mc-testimonials-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-6xl mx-auto">
      @if (props?.heading) { <h2 class="mc-heading text-3xl md:text-4xl font-bold text-center mb-10">{{ props.heading }}</h2> }
      <div class="grid md:grid-cols-3 gap-4">
        @for (it of (props?.items ?? []); track $index) {
          <figure class="mc-card p-6">
            <blockquote class="text-fg mb-4 leading-relaxed">"{{ it.quote }}"</blockquote>
            <figcaption class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-gradient-brand grid place-items-center text-xs font-bold text-white">
                {{ it.author?.[0] }}
              </div>
              <div>
                <div class="text-sm font-medium">{{ it.author }}</div>
                @if (it.role) { <div class="text-xs text-fg-subtle">{{ it.role }}</div> }
              </div>
            </figcaption>
          </figure>
        }
      </div>
    </div>
  </section>
  `,
})
export class TestimonialsSection { @Input() props: TestimonialsSectionProps = {}; }
