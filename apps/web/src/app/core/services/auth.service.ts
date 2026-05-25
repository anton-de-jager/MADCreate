import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { AuthSession, AuthUser, AuthMembership, ApiResponse } from '@madcreate/shared';
import { environment } from '@env/environment';
import { TenantContextService } from './tenant-context.service';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = 'mc.auth.v1';

interface StoredSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  memberships: AuthMembership[];
  currentWorkspaceId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tenantCtx = inject(TenantContextService);

  // signals are the source of truth — components read computed views.
  private readonly _session = signal<StoredSession | null>(this.loadFromStorage());

  readonly session = this._session.asReadonly();
  readonly user = computed(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this._session());
  readonly isSuperAdmin = computed(() => !!this._session()?.user.isSuperAdmin);
  readonly memberships = computed(() => this._session()?.memberships ?? []);
  readonly currentWorkspace = computed(() => {
    const s = this._session();
    if (!s) return null;
    return s.memberships.find((m) => m.workspaceId === s.currentWorkspaceId) ?? s.memberships[0] ?? null;
  });

  async register(body: { email: string; password: string; firstName?: string; lastName?: string; workspaceName?: string }) {
    const res = await firstValueFrom(this.http.post<ApiResponse<{ user: AuthUser; tokens: AuthTokens; workspace?: { id: string; slug: string; name: string } }>>(`${environment.apiBaseUrl}/auth/register`, body));
    if (!res.ok) throw new Error(res.error.message);
    const session: StoredSession = {
      user: res.data.user,
      accessToken: res.data.tokens.accessToken,
      refreshToken: res.data.tokens.refreshToken,
      memberships: res.data.workspace
        ? [{ workspaceId: res.data.workspace.id, workspaceName: res.data.workspace.name, workspaceSlug: res.data.workspace.slug, role: 'WORKSPACE_OWNER' }]
        : [],
      currentWorkspaceId: res.data.workspace?.id,
    };
    this.persist(session);
    return session;
  }

  async login(email: string, password: string) {
    const res = await firstValueFrom(this.http.post<ApiResponse<AuthSession>>(`${environment.apiBaseUrl}/auth/login`, { email, password }));
    if (!res.ok) throw new Error(res.error.message);
    const session: StoredSession = {
      user: res.data.user,
      accessToken: res.data.tokens.accessToken,
      refreshToken: res.data.tokens.refreshToken,
      memberships: res.data.memberships,
      currentWorkspaceId: res.data.currentWorkspaceId ?? res.data.memberships[0]?.workspaceId,
    };
    this.persist(session);
    return session;
  }

  async logout() {
    try { await firstValueFrom(this.http.post(`${environment.apiBaseUrl}/auth/logout`, {})); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY);
    this._session.set(null);
    this.tenantCtx.set(null);
    void this.router.navigateByUrl('/login');
  }

  /**
   * Hydrate the session from a response that matches the login shape
   * (user + tokens + memberships). Used by magic-link and other OAuth flows.
   */
  hydrateSession(data: { user: AuthUser; tokens: { accessToken: string; refreshToken: string }; memberships: AuthMembership[]; currentWorkspaceId?: string }) {
    const session: StoredSession = {
      user: data.user,
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
      memberships: data.memberships,
      currentWorkspaceId: data.currentWorkspaceId ?? data.memberships[0]?.workspaceId,
    };
    this.persist(session);
  }

  switchWorkspace(workspaceId: string) {
    const s = this._session();
    if (!s) return;
    this.persist({ ...s, currentWorkspaceId: workspaceId });
  }

  getAccessToken(): string | null {
    return this._session()?.accessToken ?? null;
  }
  getRefreshToken(): string | null {
    return this._session()?.refreshToken ?? null;
  }

  async tryRefresh(): Promise<boolean> {
    const refresh = this.getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await firstValueFrom(this.http.post<ApiResponse<{ tokens: AuthTokens }>>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken: refresh }));
      if (!res.ok) return false;
      const s = this._session();
      if (!s) return false;
      this.persist({ ...s, accessToken: res.data.tokens.accessToken, refreshToken: res.data.tokens.refreshToken });
      return true;
    } catch {
      return false;
    }
  }

  private loadFromStorage(): StoredSession | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  }

  private persist(s: StoredSession) {
    this._session.set(s);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }
}
