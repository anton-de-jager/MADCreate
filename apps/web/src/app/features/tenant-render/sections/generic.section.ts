import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GenericSectionProps {
  title?: string;
  heading?: string;
  subtitle?: string;
  subheading?: string;
  description?: string;
  body?: string;
  content?: string;
}

// Catch-all for section kinds the renderer doesn't (yet) have a dedicated
// component for — renders any recognisable text props (title, heading,
// description, etc.) in a clean layout. Never leaks raw JSON to visitors.
@Component({
  selector: 'mc-generic-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-12">
    <div class="max-w-3xl mx-auto p-5">
      @if (title)       { <h2 class="mc-heading text-2xl font-semibold mb-2">{{ title }}</h2> }
      @if (subtitle)    { <p class="text-base text-fg-muted mb-4">{{ subtitle }}</p> }
      @if (description) { <p class="text-sm mb-4">{{ description }}</p> }
      @if (body)        { <div class="text-sm leading-relaxed">{{ body }}</div> }
    </div>
  </section>
  `,
})
export class GenericSection {
  @Input() kind = 'unknown';
  @Input() props: GenericSectionProps = {};

  /** Resolve the most likely "title" field from props. */
  protected get title(): string | null {
    return this.props?.title ?? this.props?.heading ?? null;
  }

  /** Resolve the most likely "subtitle" field from props. */
  protected get subtitle(): string | null {
    return this.props?.subtitle ?? this.props?.subheading ?? null;
  }

  /** Resolve the most likely "description" field from props. */
  protected get description(): string | null {
    return this.props?.description ?? null;
  }

  /** Resolve the most likely "body" field from props. */
  protected get body(): string | null {
    return this.props?.body ?? this.props?.content ?? null;
  }
}
