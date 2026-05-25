import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';


export interface GalleryItemProps {
  src?: string;
  alt?: string;
}

export interface GallerySectionProps {
  heading?: string;
  items?: GalleryItemProps[];
}

@Component({
  selector: 'mc-gallery-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-6xl mx-auto">
      @if (props?.heading) {
        <h2 class="mc-heading text-3xl font-bold text-center mb-10">{{ props.heading }}</h2>
      }
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        @for (it of (props?.items ?? []); track $index) {
          <div class="relative aspect-square rounded-lg overflow-hidden bg-surface-subtle group">
            @if (it.src) {
              <img [src]="it.src" [alt]="it.alt || ''" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            } @else {
              <div class="w-full h-full grid place-items-center text-fg-subtle text-sm">{{ it.alt || 'Image' }}</div>
            }
          </div>
        }
      </div>
    </div>
  </section>
  `,
})
export class GallerySection { @Input() props: GallerySectionProps = {}; }
