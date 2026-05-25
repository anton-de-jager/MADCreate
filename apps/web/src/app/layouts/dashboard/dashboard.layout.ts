import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { TenantContextService } from '../../core/services/tenant-context.service';
import { ConfirmOverlayComponent } from '../../core/components/confirm-overlay.component';
import { NotificationService } from '../../core/services/notification.service';

interface NavItem { label: string; href: string; icon: string; section?: string; }

@Component({
  selector: 'mc-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ConfirmOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div class="h-screen flex overflow-hidden bg-surface text-fg">
    <!-- Sidebar -->
    <aside
      class="hidden md:flex md:flex-col w-64 shrink-0 border-r border-white/5 bg-surface-raised/40 backdrop-blur-xl"
      [class.md:w-20]="collapsed()"
    >
      <div class="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <a routerLink="/app/home" class="flex items-center gap-2.5 group">
          @if (collapsed()) {
            <img src="/icon-MADCreate.png" alt="MADCreate" class="w-8 h-8" />
          } @else {
            <img src="/logo-wide-MADCreate.png" alt="MADCreate" class="h-8 w-auto" />
          }
        </a>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        @for (section of sections; track section.title) {
          <div>
            @if (!collapsed()) {
              <div class="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">{{ section.title }}</div>
            }
            <ul class="space-y-0.5">
              @for (item of section.items; track item.href) {
                <li>
                  <a [routerLink]="item.href"
                     routerLinkActive="bg-white/10 text-fg"
                     class="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-fg-muted hover:text-fg hover:bg-white/5 transition-colors"
                     [title]="item.label">
                    <i [class]="item.icon + ' w-5 text-center'"></i>
                    @if (!collapsed()) { <span>{{ item.label }}</span> }
                  </a>
                </li>
              }
            </ul>
          </div>
        }
      </nav>

      <div class="p-3 border-t border-white/5 space-y-2">
        <button class="mc-btn-ghost w-full justify-start" (click)="collapsed.set(!collapsed())" [title]="collapsed() ? 'Expand' : 'Collapse'">
          <i [class]="collapsed() ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
          @if (!collapsed()) { <span>Collapse</span> }
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Topbar -->
      <header class="h-16 px-4 md:px-6 flex items-center gap-3 border-b border-white/5 bg-surface/60 backdrop-blur-xl sticky top-0 z-30">
        <div class="flex-1 flex items-center gap-3">
          <div class="hidden md:flex items-center gap-2 text-sm">
            <span class="mc-chip">
              <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
              {{ workspace()?.workspaceName ?? 'No workspace' }}
            </span>
            @if (tenant()) {
              <span class="text-fg-subtle">/</span>
              <span class="mc-chip">{{ tenant()?.name }}</span>
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="relative group">
            <button class="mc-btn-ghost !p-2 relative" title="Notifications" (click)="notifOpen.set(!notifOpen())">
              <i class="fa-solid fa-bell text-lg"></i>
              @if (notify.unreadCount() > 0) {
                <span class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-[10px] font-bold grid place-items-center text-brand-fg">{{ notify.unreadCount() }}</span>
              }
            </button>
            @if (notifOpen()) {
              <div class="absolute right-0 top-full pt-2 w-80 z-50">
                <div class="mc-card p-0 max-h-80 flex flex-col">
                  <div class="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                    <span class="text-sm font-medium">Notifications</span>
                    @if (notify.unreadCount() > 0) {
                      <button class="text-xs text-brand hover:underline" (click)="notify.markAllRead()">Mark all read</button>
                    }
                  </div>
                  <div class="flex-1 overflow-y-auto">
                    @if (notify.notifications().length === 0) {
                      <div class="px-4 py-6 text-xs text-fg-muted text-center">No notifications yet</div>
                    }
                    @for (n of notify.notifications(); track n.id) {
                      <div class="px-4 py-3 border-b border-white/5 text-sm hover:bg-white/5 transition-colors" [class.opacity-60]="n.read">
                        <div class="font-medium text-xs">{{ n.title }}</div>
                        <div class="text-xs text-fg-muted mt-0.5">{{ n.body }}</div>
                        @if (n.href) {
                          <a [href]="n.href" class="text-xs text-brand hover:underline mt-1 inline-block">View →</a>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          <button class="mc-btn-ghost !p-2" (click)="theme.toggle()" title="Toggle theme">
            <i [class]="theme.mode() === 'dark' ? 'fa-solid fa-moon text-lg' : 'fa-solid fa-sun text-lg'"></i>
          </button>
          <div class="relative group">
            <button class="flex items-center gap-2 mc-btn-ghost !pl-2 !pr-3">
              <div class="w-7 h-7 rounded-full bg-gradient-brand grid place-items-center text-xs font-bold text-brand-fg">
                {{ initial() }}
              </div>
              <span class="hidden md:inline text-sm">{{ user()?.email }}</span>
            </button>
            <div class="absolute right-0 top-full pt-2 w-56 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
            <div class="mc-card p-1.5">
              <a routerLink="/app/settings" class="block px-3 py-2 text-sm rounded hover:bg-white/5">Settings</a>
              @if (isSuperAdmin()) {
                <a routerLink="/app/admin"  class="block px-3 py-2 text-sm rounded hover:bg-white/5">Super admin</a>
                <a routerLink="/app/claude" class="block px-3 py-2 text-sm rounded hover:bg-white/5">Claude tasks</a>
              }
              <button (click)="logout()" class="block w-full text-left px-3 py-2 text-sm rounded hover:bg-white/5 text-danger">
                Sign out
              </button>
            </div>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10 animate-fade-in">
          <router-outlet />
        </div>
      </main>
    </div>
  </div>

  <!-- Shared confirm / toast overlay — reads NotificationService signals. -->
  <mc-confirm-overlay />
  `,
})
export class DashboardLayout {
  private readonly auth = inject(AuthService);
  private readonly tenantCtx = inject(TenantContextService);
  protected readonly theme = inject(ThemeService);
  protected readonly notify = inject(NotificationService);
  protected readonly notifOpen = signal(false);

  protected readonly collapsed = signal(false);
  protected readonly user = this.auth.user;
  protected readonly workspace = this.auth.currentWorkspace;
  protected readonly isSuperAdmin = this.auth.isSuperAdmin;
  protected readonly tenant = this.tenantCtx.current;

  protected readonly sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Workspace',
      items: [
        { label: 'Home',         href: '/app/home',         icon: 'fa-solid fa-house' },
        { label: 'Tenants',      href: '/app/tenants',      icon: 'fa-solid fa-building' },
        { label: 'Sites',        href: '/app/sites',        icon: 'fa-solid fa-globe' },
      ],
    },
    {
      title: 'Build',
      items: [
        { label: 'Onboarding',   href: '/app/onboarding',   icon: 'fa-solid fa-wand-magic-sparkles' },
        { label: 'Themes',       href: '/app/themes',       icon: 'fa-solid fa-palette' },
        { label: 'Media',        href: '/app/media',        icon: 'fa-solid fa-images' },
        { label: 'Marketplace',  href: '/app/marketplace',  icon: 'fa-solid fa-store' },
      ],
    },
    {
      title: 'Ship',
      items: [
        { label: 'Domains',      href: '/app/domains',      icon: 'fa-solid fa-link' },
        { label: 'Deployments',  href: '/app/deployments',  icon: 'fa-solid fa-rocket' },
        { label: 'Integrations', href: '/app/integrations', icon: 'fa-solid fa-plug' },
      ],
    },
    {
      title: 'Grow',
      items: [
        { label: 'Leads',        href: '/app/leads',        icon: 'fa-solid fa-envelope' },
        { label: 'Analytics',    href: '/app/analytics',    icon: 'fa-solid fa-chart-line' },
        { label: 'Settings',     href: '/app/settings',     icon: 'fa-solid fa-gear' },
      ],
    },
  ];

  protected initial(): string {
    const u = this.user();
    if (!u) return '?';
    return (u.firstName?.[0] ?? u.email[0] ?? '?').toUpperCase();
  }

  protected logout() { void this.auth.logout(); }
}
