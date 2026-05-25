import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'mc-register',
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
        <h1 class="mc-heading text-2xl font-bold mb-1">Create your studio.</h1>
        <p class="text-sm text-fg-muted mb-6">Free forever for your first tenant.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mc-label">First name</label>
              <input class="mc-input" type="text" formControlName="firstName" autocomplete="given-name" />
            </div>
            <div>
              <label class="mc-label">Last name</label>
              <input class="mc-input" type="text" formControlName="lastName" autocomplete="family-name" />
            </div>
          </div>
          <div>
            <label class="mc-label">Workspace name</label>
            <input class="mc-input" type="text" formControlName="workspaceName" placeholder="MAD Prospects" />
          </div>
          <div>
            <label class="mc-label">Email</label>
            <input class="mc-input" type="email" formControlName="email" autocomplete="email" />
          </div>
          <div>
            <label class="mc-label">Password</label>
            <input class="mc-input" type="password" formControlName="password" autocomplete="new-password" />
            <p class="text-xs text-fg-subtle mt-1">Min 8 characters.</p>
          </div>

          @if (error()) { <div class="text-sm text-danger">{{ error() }}</div> }

          <button type="submit" [disabled]="form.invalid || submitting()" class="mc-btn-primary w-full !py-3">
            {{ submitting() ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-fg-muted">
          Have an account?
          <a routerLink="/login" class="text-brand hover:underline ml-1">Sign in</a>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    workspaceName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit() {
    if (this.form.invalid) return;
    this.submitting.set(true); this.error.set(null);
    try {
      const plan = this.route.snapshot.queryParamMap.get('plan');
      if (plan) {
        try { sessionStorage.setItem('mc.pending-plan', plan); } catch { /* ignore */ }
      }
      await this.auth.register(this.form.getRawValue());
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/app/onboarding';
      void this.router.navigateByUrl(redirect);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.submitting.set(false);
    }
  }
}
