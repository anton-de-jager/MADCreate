import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'mc-verify-email',
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
          @case ('verifying') {
            <div class="mb-3 text-4xl"><i class="fa-solid fa-spinner fa-spin"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Verifying your email…</h1>
            <p class="text-sm text-fg-muted">One moment.</p>
          }
          @case ('done') {
            <div class="mb-3 text-4xl text-green-400"><i class="fa-solid fa-check"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Email verified.</h1>
            <p class="text-sm text-fg-muted mb-6">You're all set. Redirecting to sign-in…</p>
            <a routerLink="/login" class="mc-btn-primary w-full !py-3">Go to sign-in</a>
          }
          @case ('error') {
            <div class="mb-3 text-4xl text-danger"><i class="fa-solid fa-xmark"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Verification failed</h1>
            <p class="text-sm text-fg-muted mb-6">{{ error() }}</p>
            <a routerLink="/login" class="mc-btn-secondary w-full !py-3">Back to sign-in</a>
          }
          @case ('no-token') {
            <div class="mb-3 text-4xl text-danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">No token in link</h1>
            <p class="text-sm text-fg-muted mb-6">This verification URL is missing the <code>?token=</code> parameter. Please use the link from your email.</p>
            <a routerLink="/login" class="mc-btn-secondary w-full !py-3">Back to sign-in</a>
          }
        }
      </div>
    </div>
  </div>
  `,
})
export class VerifyEmailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly state = signal<'verifying' | 'done' | 'error' | 'no-token'>('verifying');
  protected readonly error = signal<string>('');

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) { this.state.set('no-token'); return; }
    this.api.post('/auth/email/verify', { token }).subscribe({
      next: () => {
        this.state.set('done');
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (e: Error) => { this.state.set('error'); this.error.set(e.message); },
    });
  }
}
