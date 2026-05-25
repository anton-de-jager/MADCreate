import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'mc-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="min-h-screen relative grid place-items-center px-4 overflow-hidden">
    <div class="absolute inset-0 bg-aurora opacity-40 pointer-events-none"></div>
    <div class="absolute inset-0 mc-grid-bg opacity-20 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"></div>

    <div class="relative w-full max-w-md">
      <a routerLink="/" class="flex items-center gap-2.5 justify-center mb-8">
        <img src="/logo-MADCreate.png" alt="MADCreate" class="h-10 w-auto" />
      </a>

      <div class="mc-card p-8 animate-fade-up">
        @if (!token()) {
          <div class="text-center">
            <div class="mb-3 text-4xl text-danger"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">No reset token</h1>
            <p class="text-sm text-fg-muted mb-6">This link is missing the <code>?token=</code> parameter. Request a new password reset email.</p>
            <a routerLink="/login" class="mc-btn-secondary w-full !py-3">Back to sign-in</a>
          </div>
        } @else if (done()) {
          <div class="text-center">
            <div class="mb-3 text-4xl text-green-400"><i class="fa-solid fa-check"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Password updated.</h1>
            <p class="text-sm text-fg-muted mb-6">You can sign in with your new password now. Redirecting…</p>
            <a routerLink="/login" class="mc-btn-primary w-full !py-3">Go to sign-in</a>
          </div>
        } @else {
          <h1 class="mc-heading text-2xl font-bold mb-1">Set a new password</h1>
          <p class="text-sm text-fg-muted mb-6">Pick something at least 8 characters long.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="mc-label">New password</label>
              <input class="mc-input" type="password" formControlName="password" autocomplete="new-password" />
            </div>
            <div>
              <label class="mc-label">Confirm</label>
              <input class="mc-input" type="password" formControlName="confirm" autocomplete="new-password" />
            </div>

            @if (error()) { <div class="text-sm text-danger">{{ error() }}</div> }

            <button type="submit" [disabled]="form.invalid || submitting()" class="mc-btn-primary w-full !py-3">
              {{ submitting() ? 'Updating…' : 'Update password' }}
            </button>
          </form>
        }
      </div>
    </div>
  </div>
  `,
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly token = signal<string | null>(this.route.snapshot.queryParamMap.get('token'));
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm:  ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (v.password !== v.confirm) { this.error.set('Passwords do not match.'); return; }
    this.submitting.set(true); this.error.set(null);
    this.api.post('/auth/password/reset', { token: this.token(), password: v.password }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (e: Error) => { this.submitting.set(false); this.error.set(e.message); },
    });
  }
}
