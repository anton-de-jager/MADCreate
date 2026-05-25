import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import type { AuthUser, AuthMembership } from '@madcreate/shared';

interface MagicLinkResponse {
  user: AuthUser;
  tokens: { accessToken: string; refreshToken: string };
  memberships: AuthMembership[];
  currentWorkspaceId?: string;
  redirect?: string;
}

@Component({
  selector: 'mc-magic-link',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="min-h-screen relative grid place-items-center px-4 overflow-hidden">
    <div class="absolute inset-0 bg-aurora opacity-40 pointer-events-none"></div>
    <div class="absolute inset-0 mc-grid-bg opacity-20 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>

    <div class="relative w-full max-w-md">
      <a routerLink="/" class="flex items-center gap-2.5 justify-center mb-8">
        <img src="/logo-MADCreate.png" alt="MADCreate" class="h-10 w-auto" />
      </a>

      <div class="mc-card p-8 animate-fade-up text-center">
        @switch (state()) {
          @case ('exchanging') {
            <div class="mb-3 text-4xl"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Signing you in…</h1>
            <p class="text-sm text-fg-muted">Exchanging your magic link.</p>
          }
          @case ('done') {
            <div class="mb-3 text-4xl text-green-400"><i class="fa-solid fa-check"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Signed in.</h1>
            <p class="text-sm text-fg-muted">Redirecting to your studio…</p>
          }
          @case ('error') {
            <div class="mb-3 text-4xl text-danger"><i class="fa-solid fa-xmark"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Magic link invalid</h1>
            <p class="text-sm text-fg-muted mb-6">{{ error() }}</p>
            <a routerLink="/login" class="mc-btn-primary w-full !py-3">Sign in with password</a>
          }
          @case ('no-token') {
            <div class="mb-3 text-4xl text-danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">No token in link</h1>
            <p class="text-sm text-fg-muted mb-6">This magic link is missing the <code>?token=</code> parameter.</p>
            <a routerLink="/login" class="mc-btn-secondary w-full !py-3">Sign in with password</a>
          }
        }
      </div>
    </div>
  </div>
  `,
})
export class MagicLinkPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly state = signal<'exchanging' | 'done' | 'error' | 'no-token'>('exchanging');
  protected readonly error = signal<string>('');

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.state.set('no-token'); return; }
    // POST /v1/auth/magic { token } — backend exchanges the one-shot token for
    // a normal login response { user, tokens, memberships, currentWorkspaceId }.
    this.api.post<MagicLinkResponse>('/auth/magic', { token }).subscribe({
      next: (r) => {
        this.auth.hydrateSession(r);
        this.state.set('done');
        const redirect = r.redirect || '/app/home';
        setTimeout(() => this.router.navigateByUrl(redirect), 1500);
      },
      error: (e: Error) => { this.state.set('error'); this.error.set(e.message || 'Link is invalid or expired.'); },
    });
  }
}
