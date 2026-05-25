import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';


export interface VideoSectionProps {
  heading?: string;
  src?: string;
  poster?: string;
}

@Component({
  selector: 'mc-video-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-4xl mx-auto">
      @if (props?.heading) {
        <h2 class="mc-heading text-3xl font-bold text-center mb-8">{{ props.heading }}</h2>
      }
      <div class="relative aspect-video rounded-lg overflow-hidden bg-surface-subtle">
        @if (isYouTube()) {
          <iframe [src]="embedUrl()" class="absolute inset-0 w-full h-full" frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen></iframe>
        } @else if (props?.src) {
          <video class="w-full h-full object-cover" controls [poster]="props.poster || ''">
            <source [src]="props.src" />
          </video>
        } @else {
          <div class="w-full h-full grid place-items-center text-fg-subtle">No video source</div>
        }
      </div>
    </div>
  </section>
  `,
})
export class VideoSection {
  @Input() props: VideoSectionProps = {};

  protected isYouTube(): boolean {
    const src = this.props?.src ?? '';
    return /youtube\.com|youtu\.be/.test(src);
  }

  protected embedUrl(): string {
    const src = this.props?.src ?? '';
    const match = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : src;
  }
}
