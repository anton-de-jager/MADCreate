import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';


export interface TeamMemberProps {
  avatarUrl?: string;
  name?: string;
  role?: string;
}

export interface TeamSectionProps {
  heading?: string;
  items?: TeamMemberProps[];
}

@Component({
  selector: 'mc-team-section',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <section class="px-6 py-20">
    <div class="max-w-6xl mx-auto">
      @if (props?.heading) {
        <h2 class="mc-heading text-3xl font-bold text-center mb-10">{{ props.heading }}</h2>
      }
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        @for (it of (props?.items ?? []); track $index) {
          <div class="text-center">
            <div class="w-24 h-24 mx-auto rounded-full overflow-hidden bg-surface-subtle mb-4">
              @if (it.avatarUrl) {
                <img [src]="it.avatarUrl" [alt]="it.name" class="w-full h-full object-cover" />
              } @else {
                <div class="w-full h-full grid place-items-center text-2xl font-bold text-fg-subtle">
                  {{ (it.name || '?')[0] }}
                </div>
              }
            </div>
            <h3 class="font-semibold">{{ it.name }}</h3>
            @if (it.role) { <p class="text-sm text-fg-muted mt-1">{{ it.role }}</p> }
          </div>
        }
      </div>
    </div>
  </section>
  `,
})
export class TeamSection { @Input() props: TeamSectionProps = {}; }
