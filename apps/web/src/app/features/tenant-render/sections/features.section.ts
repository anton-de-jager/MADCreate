import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FeaturesItemProps {
  icon?: string;
  title?: string;
  body?: string;
}

export interface FeaturesSectionProps {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  columns?: number;
  items?: FeaturesItemProps[];
}

@Component({
  selector: 'mc-features-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-6xl mx-auto">
      @if (props?.eyebrow) { <div class="mc-eyebrow text-center mb-2">{{ props.eyebrow }}</div> }
      <h2 class="mc-heading text-3xl md:text-5xl font-bold text-center max-w-3xl mx-auto">
        {{ props?.heading }}
      </h2>
      @if (props?.subheading) {
        <p class="mt-4 text-center text-fg-muted max-w-2xl mx-auto">{{ props.subheading }}</p>
      }
      <div class="mt-12 grid gap-5" [class]="gridClass()">
        @for (it of (props?.items ?? []); track $index) {
          <div class="mc-card-hover p-6">
            @if (it.icon) { <div class="w-10 h-10 rounded-md bg-brand/10 grid place-items-center text-brand mb-4">{{ it.icon }}</div> }
            <h3 class="mc-heading text-lg font-semibold mb-2">{{ it.title }}</h3>
            <p class="text-sm text-fg-muted leading-relaxed">{{ it.body }}</p>
          </div>
        }
      </div>
    </div>
  </section>
  `,
})
export class FeaturesSection {
  @Input() props: FeaturesSectionProps = {};
  protected gridClass() {
    const cols = this.props?.columns ?? 3;
    return cols === 4 ? 'md:grid-cols-2 lg:grid-cols-4'
         : cols === 2 ? 'md:grid-cols-2'
         : 'md:grid-cols-3';
  }
}
