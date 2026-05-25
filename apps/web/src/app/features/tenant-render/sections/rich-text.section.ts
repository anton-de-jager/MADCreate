import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RichTextSectionProps {
  heading?: string;
  body?: string;
}

@Component({
  selector: 'mc-rich-text-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-16">
    <div class="max-w-3xl mx-auto prose prose-invert prose-sm">
      @if (props?.heading) {
        <h2 class="mc-heading text-3xl font-bold mb-6">{{ props.heading }}</h2>
      }
      @if (props?.body) {
        <div class="text-fg-muted leading-relaxed whitespace-pre-line">{{ props.body }}</div>
      }
    </div>
  </section>
  `,
})
export class RichTextSection { @Input() props: RichTextSectionProps = {}; }
