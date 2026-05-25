import { Injectable, signal } from '@angular/core';

type Mode = 'dark' | 'light';
const STORAGE_KEY = 'mc.theme.v1';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<Mode>(this.initialMode());
  readonly mode = this._mode.asReadonly();
  private hasExplicitPref = this.hasStoredPref();

  constructor() {
    this.apply(this._mode());
    this.listenToOsChanges();
  }

  toggle() {
    this.set(this._mode() === 'dark' ? 'light' : 'dark');
  }

  set(mode: Mode) {
    this._mode.set(mode);
    this.hasExplicitPref = true;
    this.apply(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  }

  /** Apply runtime CSS-var overrides (used when rendering tenant themes). */
  applyTokens(tokens: Record<string, string> | null | undefined) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (!tokens) return;
    for (const [k, v] of Object.entries(tokens)) {
      root.style.setProperty(`--${k}`, v);
    }
  }

  private apply(mode: Mode) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(mode);
    root.setAttribute('data-theme', mode);
  }

  private initialMode(): Mode {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
      if (saved === 'dark' || saved === 'light') return saved;
    }
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  private hasStoredPref(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'dark' || saved === 'light';
    } catch { return false; }
  }

  private listenToOsChanges() {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      if (this.hasExplicitPref) return;
      const mode: Mode = e.matches ? 'dark' : 'light';
      this._mode.set(mode);
      this.apply(mode);
    });
  }
}
