import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'mc-accept-invite',
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
          @case ('accepting') {
            <div class="mb-3 text-4xl"><i class="fa-solid fa-envelope"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Accepting your invite…</h1>
            <p class="text-sm text-fg-muted">One moment.</p>
          }
          @case ('done') {
            <div class="mb-3 text-4xl text-green-400"><i class="fa-solid fa-check"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">You're in.</h1>
            <p class="text-sm text-fg-muted mb-6">Welcome to the workspace. Redirecting…</p>
          }
          @case ('needs-auth') {
            <div class="mb-3 text-4xl"><i class="fa-solid fa-lock"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Sign in to accept</h1>
            <p class="text-sm text-fg-muted mb-6">You need an account to join. Sign up or sign in, then come back to this link.</p>
            <div class="flex gap-2">
              <a [routerLink]="['/register']" [queryParams]="{ redirect: returnUrl }" class="mc-btn-primary flex-1">Create account</a>
              <a [routerLink]="['/login']" [queryParams]="{ redirect: returnUrl }" class="mc-btn-secondary flex-1">Sign in</a>
            </div>
          }
          @case ('error') {
            <div class="mb-3 text-4xl text-danger"><i class="fa-solid fa-xmark"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Invite invalid</h1>
            <p class="text-sm text-fg-muted mb-6">{{ error() }}</p>
            <a routerLink="/login" class="mc-btn-secondary w-full !py-3">Back to sign-in</a>
          }
          @case ('no-token') {
            <div class="mb-3 text-4xl text-danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">No token in link</h1>
            <p class="text-sm text-fg-muted mb-6">This invite URL is missing the <code>?token=</code> parameter.</p>
            <a routerLink="/login" class="mc-btn-secondary w-full !py-3">Back to sign-in</a>
          }
        }
      </div>
    </div>
  </div>
  `,
})
export class AcceptInvitePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly state = signal<'accepting' | 'done' | 'needs-auth' | 'error' | 'no-token'>('accepting');
  protected readonly error = signal<string>('');
  protected returnUrl = '/accept-invite' + (typeof window !== 'undefined' ? window.location.search : '');

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.state.set('no-token'); return; }

    // Must be signed in to accept — backend ties the invite to user.id.
    if (!this.auth.isAuthenticated()) { this.state.set('needs-auth'); return; }

    this.api.post('/workspaces/invites/accept', { token }).subscribe({
      next: () => {
        this.state.set('done');
        setTimeout(() => this.router.navigate(['/app/home']), 1500);
      },
      error: (e: Error) => { this.state.set('error'); this.error.set(e.message); },
    });
  }
}
