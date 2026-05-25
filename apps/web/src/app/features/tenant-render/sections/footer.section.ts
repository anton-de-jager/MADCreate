import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FooterSectionLink {
  label?: string;
  href?: string;
}

export interface FooterSectionColumn {
  heading?: string;
  links?: FooterSectionLink[];
}

export interface FooterSectionProps {
  columns?: FooterSectionColumn[];
  copyright?: string;
}

@Component({
  selector: 'mc-footer-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="border-t border-white/5 px-6 py-12">
    <div class="max-w-6xl mx-auto">
      @if ((props?.columns ?? []).length > 0) {
        <div class="grid gap-8" [style.grid-template-columns]="'repeat(' + (props.columns?.length) + ', minmax(0, 1fr))'">
          @for (col of props.columns; track $index) {
            <div>
              @if (col.heading) { <h4 class="font-semibold text-sm mb-3">{{ col.heading }}</h4> }
              <ul class="space-y-2">
                @for (link of (col.links ?? []); track $index) {
                  <li><a [href]="link.href || '#'" class="text-sm text-fg-muted hover:text-fg transition-colors">{{ link.label }}</a></li>
                }
              </ul>
            </div>
          }
        </div>
      }
      @if (props?.copyright) {
        <div class="mt-8 pt-6 border-t border-white/5 text-center text-xs text-fg-subtle">{{ props.copyright }}</div>
      }
    </div>
  </section>
  `,
})
export class FooterSection { @Input() props: FooterSectionProps = {}; }
