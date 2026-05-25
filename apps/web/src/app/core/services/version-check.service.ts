import { Injectable, signal, NgZone, inject, OnDestroy } from '@angular/core';

/**
 * Polls /version.json every 60 seconds. When the buildId changes from
 * the value fetched at startup, `updateAvailable` flips to true.
 * The component layer shows a non-dismissable snackbar prompting a reload.
 */
@Injectable({ providedIn: 'root' })
export class VersionCheckService implements OnDestroy {
  private readonly zone = inject(NgZone);
  private currentBuildId: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** True once a newer buildId is detected. */
  readonly updateAvailable = signal(false);

  constructor() {
    this.init();
  }

  private async init() {
    const id = await this.fetchBuildId();
    if (!id) return;
    this.currentBuildId = id;

    // Poll outside Angular zone to avoid unnecessary change detection cycles.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => void this.check(), 60_000);
    });
  }

  private async check() {
    if (this.updateAvailable()) return; // Already detected, stop checking.
    const id = await this.fetchBuildId();
    if (id && this.currentBuildId && id !== this.currentBuildId) {
      this.zone.run(() => this.updateAvailable.set(true));
    }
  }

  private async fetchBuildId(): Promise<string | null> {
    try {
      const res = await fetch('/version.json', { cache: 'no-cache' });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.buildId ?? null;
    } catch {
      return null;
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
