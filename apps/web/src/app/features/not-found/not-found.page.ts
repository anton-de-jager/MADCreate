import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mc-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center px-6">
      <div class="mc-card p-12 text-center max-w-md w-full">
        <h1 class="mc-heading text-7xl font-extrabold bg-gradient-brand bg-clip-text text-transparent">
          404
        </h1>
        <p class="mt-4 text-lg text-fg-muted">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a routerLink="/" class="mc-btn-primary mt-8 inline-block">
          Go Home
        </a>
      </div>
    </div>
  `,
})
export class NotFoundPage {}
