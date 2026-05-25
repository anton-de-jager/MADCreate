import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatsSectionItem {
  value?: string;
  label?: string;
}

export interface StatsSectionProps {
  items?: StatsSectionItem[];
  stats?: StatsSectionItem[];
}

@Component({
  selector: 'mc-stats-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-6xl mx-auto grid md:grid-cols-4 gap-4 text-center">
      @for (it of (props?.items ?? props?.stats ?? []); track $index) {
        <div class="mc-card p-6">
          <div class="mc-heading text-4xl font-extrabold bg-gradient-brand bg-clip-text text-transparent">{{ it.value }}</div>
          <div class="text-sm text-fg-muted mt-2">{{ it.label }}</div>
        </div>
      }
    </div>
  </section>
  `,
})
export class StatsSection { @Input() props: StatsSectionProps = {}; }
