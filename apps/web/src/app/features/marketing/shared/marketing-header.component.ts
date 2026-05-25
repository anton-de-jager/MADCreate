import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'mc-marketing-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <header class="sticky top-0 z-50 mc-glass border-b border-white/5">
    <div class="max-w-6xl mx-auto h-16 px-6 flex items-center gap-6">
      <a routerLink="/" class="flex items-center gap-2.5">
        <img src="/logo-wide-MADCreate.png" alt="MADCreate" class="h-8 w-auto" />
      </a>
      <nav class="hidden md:flex items-center gap-1 ml-4">
        <a routerLink="/" class="mc-link px-3 py-2 text-sm">Product</a>
        <a routerLink="/pricing" class="mc-link px-3 py-2 text-sm">Pricing</a>
        <a routerLink="/" fragment="showcase" class="mc-link px-3 py-2 text-sm">Showcase</a>
        <a routerLink="/" fragment="docs" class="mc-link px-3 py-2 text-sm">Docs</a>
      </nav>
      <div class="ml-auto flex items-center gap-2">
        @if (isAuth()) {
          <a routerLink="/app/home" class="mc-btn-primary">Open studio →</a>
        } @else {
          <a routerLink="/login" class="mc-btn-ghost">Sign in</a>
          <a routerLink="/register" class="mc-btn-primary">Start free</a>
        }
      </div>
    </div>
  </header>
  `,
})
export class MarketingHeader {
  protected readonly isAuth = inject(AuthService).isAuthenticated;
}
