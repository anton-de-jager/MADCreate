import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'mc-forgot-password',
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
        @if (done()) {
          <div class="text-center">
            <div class="mb-3 text-4xl text-green-400"><i class="fa-solid fa-envelope-circle-check"></i></div>
            <h1 class="mc-heading text-2xl font-bold mb-1">Check your inbox.</h1>
            <p class="text-sm text-fg-muted mb-6">If an account exists for that email, we sent a password-reset link. It may take a minute to arrive.</p>
            <a routerLink="/login" class="mc-btn-primary w-full !py-3">Back to sign-in</a>
          </div>
        } @else {
          <h1 class="mc-heading text-2xl font-bold mb-1">Forgot your password?</h1>
          <p class="text-sm text-fg-muted mb-6">Enter your email and we'll send you a reset link.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label class="mc-label">Email</label>
              <input class="mc-input" type="email" formControlName="email" placeholder="you@company.com" autocomplete="email" />
            </div>

            @if (error()) { <div class="text-sm text-danger">{{ error() }}</div> }

            <button type="submit" [disabled]="form.invalid || submitting()" class="mc-btn-primary w-full !py-3">
              {{ submitting() ? 'Sending...' : 'Send reset link' }}
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-fg-muted">
            <a routerLink="/login" class="text-brand hover:underline">Back to sign-in</a>
          </div>
        }
      </div>
    </div>
  </div>
  `,
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    this.api.post('/auth/password/request-reset', { email: this.form.getRawValue().email }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
      error: () => {
        // Always show success for security — don't reveal whether email exists.
        this.submitting.set(false);
        this.done.set(true);
      },
    });
  }
}
