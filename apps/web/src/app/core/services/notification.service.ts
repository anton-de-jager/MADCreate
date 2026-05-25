import { Injectable, computed, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ConfirmOptions {
  /** Label for the confirm button — defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button — defaults to "Cancel". */
  cancelLabel?: string;
  /** When true, the confirm button is rendered with the danger style. */
  danger?: boolean;
}

/** Internal shape of a pending confirm request — exposed via signal to the overlay. */
export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  /** Called by the overlay when the user picks an answer. */
  resolve: (value: boolean) => void;
}

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: Date;
}

export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  message: string;
}

/**
 * Lightweight overlay service — exposes a `confirm()` modal and `success/error`
 * toasts. The single `ConfirmOverlayComponent` mounted in the dashboard layout
 * reads these signals and renders both. Keeps us free of @angular/material
 * while replacing the native `window.confirm` calls.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private static readonly STORAGE_KEY = 'mc_notifications';

  private readonly _current = signal<ConfirmRequest | null>(null);
  private readonly _toast = signal<ToastMessage | null>(null);
  private readonly _notifications = signal<AppNotification[]>(this.loadFromStorage());
  private notifSeq = this.initSeq();

  /** Currently-displayed confirm dialog (or null if none). Read by the overlay. */
  readonly current = this._current.asReadonly();
  /** Active toast (or null). Read by the overlay. */
  readonly toast = this._toast.asReadonly();
  /** In-app notification list. */
  readonly notifications = this._notifications.asReadonly();
  /** Count of unread notifications. */
  readonly unreadCount = computed(() => this._notifications().filter((n) => !n.read).length);

  private toastSeq = 0;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Show a confirm dialog. Returns an Observable that emits exactly once with
   * `true` (confirm) or `false` (cancel / backdrop click) and then completes.
   *
   * Only one dialog can be active at a time — calling `confirm()` while one is
   * already open closes the prior one as cancelled.
   */
  confirm(title: string, body: string, opts?: ConfirmOptions): Observable<boolean> {
    const subject = new Subject<boolean>();

    // If something else is open, treat the prior request as cancelled so its
    // subscriber completes cleanly.
    const prior = this._current();
    if (prior) prior.resolve(false);

    const request: ConfirmRequest = {
      title,
      body,
      confirmLabel: opts?.confirmLabel ?? 'Confirm',
      cancelLabel: opts?.cancelLabel ?? 'Cancel',
      danger: opts?.danger ?? false,
      resolve: (value) => {
        // Only act on the currently-active request — late callbacks from a
        // superseded dialog are ignored.
        if (this._current() !== request) return;
        this._current.set(null);
        subject.next(value);
        subject.complete();
      },
    };

    this._current.set(request);
    return subject.asObservable();
  }

  /** Called by the overlay component when the user picks an answer. */
  resolveCurrent(value: boolean) {
    const r = this._current();
    if (r) r.resolve(value);
  }

  success(message: string): void {
    this.pushToast('success', message);
  }

  error(message: string): void {
    this.pushToast('error', message);
  }

  /** Called by the overlay when the user dismisses the toast manually. */
  dismissToast() {
    this._toast.set(null);
    if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; }
  }

  /** Push an in-app notification (shows in the header bell). */
  notify(title: string, body: string, href?: string) {
    this.notifSeq += 1;
    this._notifications.update((list) => [
      { id: this.notifSeq, title, body, href, read: false, createdAt: new Date() },
      ...list,
    ].slice(0, 50)); // keep max 50
    this.persistToStorage();
  }

  markAllRead() {
    this._notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    this.persistToStorage();
  }

  clearNotifications() {
    this._notifications.set([]);
    this.persistToStorage();
  }

  private loadFromStorage(): AppNotification[] {
    try {
      const raw = localStorage.getItem(NotificationService.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((n: Record<string, unknown>) => ({
        ...n,
        createdAt: new Date(n['createdAt'] as string),
      })) as AppNotification[];
    } catch {
      return [];
    }
  }

  private initSeq(): number {
    const list = this._notifications();
    return list.length > 0 ? Math.max(...list.map((n) => n.id)) : 0;
  }

  private persistToStorage(): void {
    try {
      localStorage.setItem(NotificationService.STORAGE_KEY, JSON.stringify(this._notifications()));
    } catch {
      // Storage full or unavailable — silently ignore.
    }
  }

  private pushToast(kind: ToastKind, message: string) {
    this.toastSeq += 1;
    const id = this.toastSeq;
    this._toast.set({ id, kind, message });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      // Only clear if this is still the active toast (avoid wiping a newer one).
      if (this._toast()?.id === id) this._toast.set(null);
      this.toastTimer = null;
    }, kind === 'error' ? 6000 : 4000);
  }
}
