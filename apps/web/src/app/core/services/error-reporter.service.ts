import { ErrorHandler, Injectable } from '@angular/core';
import { environment } from '@env/environment';

/**
 * Global error handler that captures unhandled errors AND explicit
 * console.error() calls, then logs them as MADCloud tasks via the
 * import-bulk endpoint (which deduplicates against active tasks).
 *
 * Client-side Set prevents the same error from being reported twice
 * within a session. A 3-second buffer batches rapid-fire errors into
 * a single API call.
 */
@Injectable()
export class ErrorReporterHandler implements ErrorHandler {
  private readonly reported = new Set<string>();
  private readonly buffer: Array<{ title: string; description?: string }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly originalConsoleError = console.error.bind(console);

  constructor() {
    const self = this;
    const orig = this.originalConsoleError;
    console.error = (...args: unknown[]) => {
      orig(...args);
      const message = args
        .map((a) => (a instanceof Error ? a.message : String(a)))
        .join(' ');
      self.enqueue(message);
    };
  }

  handleError(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.originalConsoleError('[Unhandled Error]', error);
    this.enqueue(msg, stack);
  }

  private enqueue(message: string, stack?: string): void {
    const key = message.slice(0, 300).trim().toLowerCase();
    if (!key || this.reported.has(key)) return;
    this.reported.add(key);

    const title = `[Console Error] ${message}`.slice(0, 300);
    const description = stack ? stack.slice(0, 2000) : undefined;
    this.buffer.push({ title, description });

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 3_000);
    }
  }

  private flush(): void {
    this.flushTimer = null;
    if (!this.buffer.length) return;

    const items = this.buffer.splice(0);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const raw = localStorage.getItem('mc.auth.v1');
      const token = raw ? JSON.parse(raw)?.accessToken : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (environment.errorReporterToken) {
        // Fallback: when no user session exists (public pages, pre-auth),
        // authenticate via the worker-token so the report isn't rejected.
        headers['X-Worker-Token'] = environment.errorReporterToken;
      }
    } catch {
      // localStorage may throw; fall back to worker token.
      if (environment.errorReporterToken) {
        headers['X-Worker-Token'] = environment.errorReporterToken;
      }
    }
    fetch(`${environment.apiBaseUrl}/ai-tasks/import-bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, source: 'error-reporter' }),
    }).catch(() => {
      // Silently swallow — never recurse on reporting errors.
    });
  }
}
