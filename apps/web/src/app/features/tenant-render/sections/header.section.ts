import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface HeaderSectionLink {
  label?: string;
  href?: string;
}

export interface HeaderSectionProps {
  logoText?: string;
  links?: HeaderSectionLink[];
}

@Component({
  selector: 'mc-header-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="border-b border-white/5">
    <div class="max-w-6xl mx-auto h-16 px-6 flex items-center gap-6">
      @if (props?.logoText) {
        <span class="mc-heading font-bold">{{ props.logoText }}</span>
      }
      <nav class="hidden md:flex items-center gap-1 ml-4">
        @for (link of (props?.links ?? []); track $index) {
          <a [href]="link.href || '#'" class="mc-link px-3 py-2 text-sm">{{ link.label }}</a>
        }
      </nav>
    </div>
  </section>
  `,
})
export class HeaderSection { @Input() props: HeaderSectionProps = {}; }
