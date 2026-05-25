import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { VersionCheckService } from '../services/version-check.service';

/**
 * Single shared overlay — mounted once in the dashboard layout. Renders the
 * pending confirm dialog (if any) and the active toast (if any). Looks and
 * behaves like the existing modals in claude.page.ts: backdrop blur, mc-card
 * body, border-t footer with Cancel + Confirm.
 */
@Component({
  selector: 'mc-confirm-overlay',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  @if (notify.current(); as req) {
    <div class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
         (click)="cancel()">
      <div class="mc-card w-full max-w-md flex flex-col" (click)="$event.stopPropagation()">
        <div class="px-6 py-4 border-b border-white/5">
          <h2 class="mc-heading text-lg font-semibold">{{ req.title }}</h2>
        </div>
        <div class="px-6 py-4 text-sm text-fg-muted whitespace-pre-line">
          {{ req.body }}
        </div>
        <div class="px-6 py-3 border-t border-white/5 flex items-center justify-end gap-2">
          <button type="button"
                  class="mc-btn-ghost !px-4 !py-2 text-sm"
                  (click)="cancel()">{{ req.cancelLabel }}</button>
          <button type="button"
                  [class]="req.danger
                    ? 'mc-btn-primary !px-4 !py-2 text-sm !bg-danger hover:!bg-danger/90'
                    : 'mc-btn-primary !px-4 !py-2 text-sm'"
                  (click)="confirm()">{{ req.confirmLabel }}</button>
        </div>
      </div>
    </div>
  }

  @if (versionCheck.updateAvailable()) {
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[102] animate-fade-up">
      <div class="mc-card px-5 py-3 flex items-center gap-4 shadow-2xl border-brand/60">
        <span class="text-sm text-fg-muted">A new version is available.</span>
        <button type="button"
                class="mc-btn-primary !px-4 !py-1.5 text-sm"
                (click)="reload()">Refresh</button>
      </div>
    </div>
  }

  @if (notify.toast(); as t) {
    <div class="fixed bottom-6 right-6 z-[101] animate-fade-up">
      <div class="mc-card px-4 py-3 flex items-start gap-3 max-w-sm shadow-2xl"
           [class.border-green-500]="t.kind === 'success'"
           [class.border-red-500]="t.kind === 'error'">
        <span class="text-base leading-none mt-0.5"
              [class.text-green-400]="t.kind === 'success'"
              [class.text-red-400]="t.kind === 'error'">
          @if (t.kind === 'success') { <i class="fa-solid fa-check"></i> } @else { <i class="fa-solid fa-xmark"></i> }
        </span>
        <div class="flex-1 text-sm">{{ t.message }}</div>
        <button type="button"
                class="text-fg-subtle hover:text-fg text-xs"
                (click)="notify.dismissToast()"
                title="Dismiss"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
  }
  `,
})
export class ConfirmOverlayComponent {
  protected readonly notify = inject(NotificationService);
  protected readonly versionCheck = inject(VersionCheckService);

  protected confirm() { this.notify.resolveCurrent(true); }
  protected cancel() { this.notify.resolveCurrent(false); }
  protected reload() { window.location.reload(); }
}
