import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'mc.tenant.v1';

interface TenantContext { id: string; slug: string; name: string }

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly _current = signal<TenantContext | null>(this.load());
  readonly current = this._current.asReadonly();

  set(ctx: TenantContext | null) {
    this._current.set(ctx);
    try {
      if (ctx) localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }

  private load(): TenantContext | null {
    if (typeof localStorage === 'undefined') return null;
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
}
