import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';

interface Member {
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null; avatarUrl: string | null };
}

@Component({
  selector: 'mc-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="mb-8">
    <h1 class="mc-heading text-3xl font-bold">Settings</h1>
    <p class="text-fg-muted mt-1">Your profile, workspace and preferences.</p>
  </div>

  <div class="grid md:grid-cols-2 gap-5">
    <!-- Profile -->
    <div class="mc-card p-6">
      <h2 class="mc-heading text-lg font-semibold mb-4">Profile</h2>
      <form [formGroup]="form" (ngSubmit)="save()" class="space-y-3">
        <div><label class="mc-label">First name</label><input class="mc-input" formControlName="firstName" /></div>
        <div><label class="mc-label">Last name</label><input class="mc-input" formControlName="lastName" /></div>
        <div><label class="mc-label">Timezone</label><input class="mc-input" formControlName="timezone" /></div>
        <button type="submit" class="mc-btn-primary w-full">Save</button>
        @if (saved()) { <div class="text-xs text-success mt-1">Saved <i class="fa-solid fa-check"></i></div> }
      </form>
    </div>

    <!-- Appearance -->
    <div class="mc-card p-6">
      <h2 class="mc-heading text-lg font-semibold mb-4">Appearance</h2>
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm">Theme mode</div>
          <div class="text-xs text-fg-subtle">Current: {{ theme.mode() }}</div>
        </div>
        <button class="mc-btn-secondary" (click)="theme.toggle()">Toggle</button>
      </div>
    </div>

    <!-- Security: change password -->
    <div id="billing" class="mc-card p-6 md:col-span-2">
      <h2 class="mc-heading text-lg font-semibold mb-1">Security</h2>
      <p class="text-xs text-fg-muted mb-4">Change your password. All other sessions are signed out automatically.</p>
      <form [formGroup]="pwForm" (ngSubmit)="changePassword()" class="grid md:grid-cols-3 gap-3">
        <div>
          <label class="mc-label">Current password</label>
          <input class="mc-input" type="password" formControlName="currentPassword" autocomplete="current-password" />
        </div>
        <div>
          <label class="mc-label">New password (≥ 8 chars)</label>
          <input class="mc-input" type="password" formControlName="newPassword" autocomplete="new-password" />
        </div>
        <div class="flex items-end">
          <button type="submit" class="mc-btn-primary w-full" [disabled]="pwForm.invalid || pwBusy()">
            {{ pwBusy() ? 'Changing…' : 'Change password' }}
          </button>
        </div>
      </form>
      @if (pwOk())    { <div class="text-xs text-success mt-2">Password changed. Other sessions signed out.</div> }
      @if (pwError()) { <div class="text-xs text-danger mt-2">{{ pwError() }}</div> }
    </div>

    <!-- Workspace members -->
    <div class="mc-card p-6 md:col-span-2">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="mc-heading text-lg font-semibold">Workspace members</h2>
          <p class="text-xs text-fg-muted">People with access to <b>{{ currentWorkspaceName() }}</b>.</p>
        </div>
        <button class="mc-btn-secondary text-sm" (click)="toggleInvite()">@if (showInvite()) { Cancel } @else { <i class="fa-solid fa-plus"></i> Invite }</button>
      </div>

      @if (showInvite()) {
        <form [formGroup]="inviteForm" (ngSubmit)="invite()" class="flex flex-wrap gap-2 mb-4 p-3 rounded border border-white/5">
          <input class="mc-input !py-2 flex-1 min-w-[200px]" type="email" placeholder="teammate@example.com" formControlName="email" />
          <select class="mc-input !py-2 !w-auto" formControlName="role">
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
            <option value="BILLING">Billing</option>
          </select>
          <button type="submit" class="mc-btn-primary text-sm" [disabled]="inviteForm.invalid || inviteBusy()">
            {{ inviteBusy() ? 'Sending…' : 'Send invite' }}
          </button>
        </form>
        @if (inviteOk())    { <div class="text-xs text-success mb-2">Invite sent.</div> }
        @if (inviteError()) { <div class="text-xs text-danger mb-2">{{ inviteError() }}</div> }
      }

      @if (membersLoading()) {
        <!-- Skeleton member rows match the loaded layout — avatar + two lines + chip. -->
        <ul class="space-y-2">
          @for (_ of [1,2,3]; track _) {
            <li class="flex items-center gap-3 p-3 rounded border border-white/5">
              <div class="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
              <div class="flex-1 min-w-0 space-y-2">
                <div class="h-4 w-40 rounded bg-white/10 animate-pulse"></div>
                <div class="h-3 w-56 rounded bg-white/10 animate-pulse"></div>
              </div>
              <div class="h-5 w-14 rounded bg-white/10 animate-pulse"></div>
            </li>
          }
        </ul>
      } @else if (members().length === 0) {
        <div class="text-sm text-fg-muted">No members yet.</div>
      } @else {
        <ul class="space-y-2">
          @for (m of members(); track m.userId) {
            <li class="flex items-center gap-3 p-3 rounded border border-white/5">
              <div class="w-8 h-8 rounded-full bg-gradient-brand grid place-items-center text-xs font-bold text-brand-fg">
                {{ initial(m.user) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ m.user.firstName || m.user.email }} {{ m.user.lastName ?? '' }}</div>
                <div class="text-xs text-fg-subtle truncate">{{ m.user.email }}</div>
              </div>
              <span class="mc-chip text-xs">{{ m.role }}</span>
            </li>
          }
        </ul>
      }
    </div>

    <!-- Billing -->
    <div class="mc-card p-6 md:col-span-2">
      <h2 class="mc-heading text-lg font-semibold mb-1">Billing</h2>
      <p class="text-xs text-fg-muted mb-4">Manage your subscription and payment method.</p>
      @if (billingLoading()) {
        <div class="h-16 rounded bg-white/10 animate-pulse"></div>
      } @else if (subscription()) {
        <div class="flex items-center justify-between p-4 rounded border border-white/5">
          <div>
            <div class="font-medium">{{ subscription()!.plan?.name ?? 'Unknown plan' }}</div>
            <div class="text-xs text-fg-subtle">
              {{ subscription()!.status }} &middot; {{ subscription()!.interval }}
              @if (subscription()!.cancelAtPeriodEnd) { &middot; <span class="text-warning">Cancels at period end</span> }
            </div>
          </div>
          <button class="mc-btn-secondary text-sm" (click)="manageSubscription()" [disabled]="portalBusy()">
            {{ portalBusy() ? 'Loading…' : 'Manage subscription' }}
          </button>
        </div>
      } @else {
        <div class="flex items-center justify-between p-4 rounded border border-white/5">
          <div>
            <div class="font-medium">Free plan</div>
            <div class="text-xs text-fg-subtle">No active subscription</div>
          </div>
          <a routerLink="/pricing" class="mc-btn-primary text-sm">Upgrade</a>
        </div>
      }
      @if (billingError()) { <div class="text-xs text-danger mt-2">{{ billingError() }}</div> }
    </div>

    <!-- Workspaces (switch) -->
    <div class="mc-card p-6 md:col-span-2">
      <h2 class="mc-heading text-lg font-semibold mb-4">Your workspaces</h2>
      <ul class="space-y-2">
        @for (m of memberships(); track m.workspaceId) {
          <li class="flex items-center justify-between p-3 rounded border border-white/5">
            <div>
              <div class="font-medium">{{ m.workspaceName }}</div>
              <div class="text-xs text-fg-subtle">{{ m.role }}</div>
            </div>
            <div class="flex gap-2">
              <button class="mc-btn-ghost text-xs" (click)="switchWs(m.workspaceId)"
                      [disabled]="m.workspaceId === currentId()">
                {{ m.workspaceId === currentId() ? 'Current' : 'Switch' }}
              </button>
              <button class="mc-btn-ghost text-xs text-danger" (click)="leaveWorkspace(m.workspaceId, m.workspaceName)">
                Leave
              </button>
            </div>
          </li>
        }
      </ul>
    </div>

    <!-- Danger zone -->
    <div class="mc-card p-6 md:col-span-2 border-danger/30">
      <h2 class="mc-heading text-lg font-semibold mb-1 text-danger">Danger zone</h2>
      <p class="text-xs text-fg-muted mb-4">
        Deletes your account, revokes every active session, and removes you from all workspaces. Soft-delete only — data is recoverable for 30 days by an admin.
      </p>
      <button class="mc-btn-secondary text-danger border-danger/40 hover:bg-danger/10" (click)="deleteAccount()" [disabled]="deleteBusy()">
        @if (deleteBusy()) { Deleting… } @else { <i class="fa-solid fa-xmark"></i> Delete my account }
      </button>
      @if (deleteError()) { <div class="text-xs text-danger mt-2">{{ deleteError() }}</div> }
    </div>
  </div>
  `,
})
export class SettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(ThemeService);

  // Profile
  protected readonly form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    timezone: ['UTC'],
  });
  protected readonly saved = signal(false);

  // Security
  protected readonly pwForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly pwBusy = signal(false);
  protected readonly pwOk = signal(false);
  protected readonly pwError = signal<string | null>(null);

  // Members + invite
  protected readonly members = signal<Member[]>([]);
  protected readonly membersLoading = signal(true);
  protected readonly showInvite = signal(false);
  protected readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['EDITOR'],
  });
  protected readonly inviteBusy = signal(false);
  protected readonly inviteOk = signal(false);
  protected readonly inviteError = signal<string | null>(null);

  // Billing
  protected readonly subscription = signal<any | null>(null);
  protected readonly billingLoading = signal(true);
  protected readonly billingError = signal<string | null>(null);
  protected readonly portalBusy = signal(false);

  // Delete account
  protected readonly deleteBusy = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly memberships = this.auth.memberships;
  protected readonly currentId = () => this.auth.currentWorkspace()?.workspaceId;
  protected readonly currentWorkspaceName = computed(() => this.auth.currentWorkspace()?.workspaceName ?? '—');

  ngOnInit() {
    this.api.get<{ firstName: string | null; lastName: string | null; timezone: string }>('/users/me').subscribe({
      next: (u) => this.form.patchValue({ firstName: u.firstName ?? '', lastName: u.lastName ?? '', timezone: u.timezone }),
      error: () => this.notify.error('Failed to load profile.'),
    });
    this.loadMembers();
    this.loadSubscription();
    if (this.route.snapshot.queryParamMap.get('tab') === 'billing') {
      setTimeout(() => document.getElementById('billing')?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    }
  }

  save() {
    this.api.patch('/users/me', this.form.getRawValue()).subscribe({
      next: () => { this.saved.set(true); setTimeout(() => this.saved.set(false), 1500); },
      error: () => this.notify.error('Failed to save profile.'),
    });
  }

  changePassword() {
    if (this.pwForm.invalid) return;
    this.pwBusy.set(true); this.pwError.set(null); this.pwOk.set(false);
    this.api.post('/auth/password/change', this.pwForm.getRawValue()).subscribe({
      next: () => {
        this.pwOk.set(true); this.pwBusy.set(false); this.pwForm.reset({ currentPassword: '', newPassword: '' });
      },
      error: (e: Error) => { this.pwError.set(e.message); this.pwBusy.set(false); },
    });
  }

  toggleInvite() {
    this.showInvite.update((s) => !s);
    this.inviteOk.set(false); this.inviteError.set(null);
  }

  invite() {
    if (this.inviteForm.invalid) return;
    const wsId = this.currentId(); if (!wsId) return;
    this.inviteBusy.set(true); this.inviteError.set(null); this.inviteOk.set(false);
    this.api.post(`/workspaces/${wsId}/invites`, this.inviteForm.getRawValue()).subscribe({
      next: () => {
        this.inviteOk.set(true); this.inviteBusy.set(false);
        this.inviteForm.reset({ email: '', role: 'EDITOR' });
        this.loadMembers();
      },
      error: (e: Error) => { this.inviteError.set(e.message); this.inviteBusy.set(false); },
    });
  }

  private loadMembers() {
    const wsId = this.currentId(); if (!wsId) { this.membersLoading.set(false); return; }
    this.membersLoading.set(true);
    this.api.get<Member[]>(`/workspaces/${wsId}/members`).subscribe({
      next: (rows) => { this.members.set(rows); this.membersLoading.set(false); },
      error: () => this.membersLoading.set(false),
    });
  }

  private loadSubscription() {
    const wsId = this.currentId(); if (!wsId) { this.billingLoading.set(false); return; }
    this.billingLoading.set(true);
    this.api.get<any>(`/billing/subscription?workspaceId=${wsId}`).subscribe({
      next: (sub) => { this.subscription.set(sub); this.billingLoading.set(false); },
      error: () => { this.billingLoading.set(false); },
    });
  }

  manageSubscription() {
    const wsId = this.currentId(); if (!wsId) return;
    this.portalBusy.set(true); this.billingError.set(null);
    this.api.post<{ portalUrl: string | null }>('/billing/portal', { workspaceId: wsId }).subscribe({
      next: (res) => {
        this.portalBusy.set(false);
        if (res.portalUrl) {
          window.location.href = res.portalUrl;
        } else {
          this.billingError.set('Billing portal is not available. Payfast merchant settings may not be configured.');
        }
      },
      error: (e: Error) => { this.billingError.set(e.message); this.portalBusy.set(false); },
    });
  }

  leaveWorkspace(wsId: string, name: string) {
    this.notify.confirm(
      `Leave "${name}"?`,
      'You\'ll lose access immediately. An admin can re-invite you later.',
      { confirmLabel: 'Leave workspace', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.api.post(`/workspaces/${wsId}/members/leave`, {}).subscribe({
        next: () => {
          this.notify.success(`Left ${name}.`);
          // Easiest path: hard refresh so AuthService rebuilds memberships.
          window.location.assign('/app/home');
        },
        error: (e: Error) => this.notify.error(e.message),
      });
    });
  }

  deleteAccount() {
    this.notify.confirm(
      'Delete your account?',
      'This soft-deletes your account, revokes all sessions, and removes you from every workspace. An admin can restore within 30 days.',
      { confirmLabel: 'Delete my account', danger: true },
    ).subscribe((ok) => {
      if (!ok) return;
      this.deleteBusy.set(true); this.deleteError.set(null);
      this.api.delete('/users/me').subscribe({
        next: () => {
          this.notify.success('Account deleted.');
          this.auth.logout();
          this.router.navigate(['/']);
        },
        error: (e: Error) => { this.deleteError.set(e.message); this.deleteBusy.set(false); },
      });
    });
  }

  switchWs(id: string) { this.auth.switchWorkspace(id); }

  protected initial(u: Member['user']): string {
    return (u.firstName?.[0] ?? u.email[0] ?? '?').toUpperCase();
  }
}
