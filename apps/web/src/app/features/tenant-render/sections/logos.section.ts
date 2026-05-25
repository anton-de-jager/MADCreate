import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';


export interface LogoItemProps {
  logoUrl?: string;
  name?: string;
}

export interface LogosSectionProps {
  heading?: string;
  items?: LogoItemProps[];
}

@Component({
  selector: 'mc-logos-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-16">
    <div class="max-w-6xl mx-auto">
      @if (props?.heading) {
        <h2 class="text-center text-sm uppercase tracking-wider text-fg-muted mb-8">{{ props.heading }}</h2>
      }
      <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        @for (it of (props?.items ?? []); track $index) {
          <div class="opacity-60 hover:opacity-100 transition-opacity">
            @if (it.logoUrl) {
              <img [src]="it.logoUrl" [alt]="it.name" class="h-8 md:h-10 w-auto object-contain" />
            } @else {
              <span class="text-lg font-semibold text-fg-muted">{{ it.name }}</span>
            }
          </div>
        }
      </div>
    </div>
  </section>
  `,
})
export class LogosSection { @Input() props: LogosSectionProps = {}; }
