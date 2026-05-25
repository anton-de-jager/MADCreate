import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

// Three top-level surfaces:
//   1. Marketing/auth   (public landing, login, register, pricing)
//   2. Dashboard        (logged-in studio: tenants, sites, AI, builder, …)
//   3. Tenant render    (/:slug/** — dynamic site rendering)
//
// The renderer comes LAST so it doesn't shadow real platform routes.

export const routes: Routes = [
  // --- Marketing & auth ---
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/marketing/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: 'pricing',
    loadComponent: () => import('./features/marketing/pricing/pricing.page').then((m) => m.PricingPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.page').then((m) => m.RegisterPage),
  },
  // Email-link landing pages (public, token-driven).
  {
    path: 'verify',
    loadComponent: () => import('./features/auth/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'magic',
    loadComponent: () => import('./features/auth/magic-link/magic-link.page').then((m) => m.MagicLinkPage),
  },
  {
    path: 'accept-invite',
    loadComponent: () => import('./features/auth/accept-invite/accept-invite.page').then((m) => m.AcceptInvitePage),
  },

  // --- Authenticated app ---
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/dashboard/dashboard.layout').then((m) => m.DashboardLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home',         loadComponent: () => import('./features/dashboard/home/home.page').then((m) => m.HomePage) },
      { path: 'onboarding',           loadComponent: () => import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage) },
      { path: 'onboarding/:tenantId', loadComponent: () => import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage) },
      { path: 'tenants',      loadComponent: () => import('./features/tenants/tenants-list.page').then((m) => m.TenantsListPage) },
      { path: 'tenants/:id',  loadComponent: () => import('./features/tenants/tenant-detail.page').then((m) => m.TenantDetailPage) },
      { path: 'sites',        loadComponent: () => import('./features/sites/sites-list.page').then((m) => m.SitesListPage) },
      { path: 'sites/:id',    loadComponent: () => import('./features/sites/site-detail.page').then((m) => m.SiteDetailPage) },
      { path: 'studio/:tenantId', loadComponent: () => import('./features/studio/studio.page').then((m) => m.StudioPage) },
      { path: 'builder/:pageId',  loadComponent: () => import('./features/builder/builder.page').then((m) => m.BuilderPage) },
      { path: 'themes',       loadComponent: () => import('./features/themes/themes.page').then((m) => m.ThemesPage) },
      { path: 'domains',      loadComponent: () => import('./features/domains/domains.page').then((m) => m.DomainsPage) },
      { path: 'integrations', loadComponent: () => import('./features/integrations/integrations.page').then((m) => m.IntegrationsPage) },
      { path: 'deployments',  loadComponent: () => import('./features/deployments/deployments.page').then((m) => m.DeploymentsPage) },
      { path: 'analytics',    loadComponent: () => import('./features/analytics/analytics.page').then((m) => m.AnalyticsPage) },
      { path: 'leads',        loadComponent: () => import('./features/leads/leads.page').then((m) => m.LeadsPage) },
      { path: 'media',        loadComponent: () => import('./features/media/media.page').then((m) => m.MediaPage) },
      { path: 'marketplace',  loadComponent: () => import('./features/marketplace/marketplace.page').then((m) => m.MarketplacePage) },
      { path: 'settings',     loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage) },
      { path: 'claude',       loadComponent: () => import('./features/claude/claude.page').then((m) => m.ClaudePage) },
      {
        path: 'admin',
        canActivate: [superAdminGuard],
        loadComponent: () => import('./features/admin/admin.page').then((m) => m.AdminPage),
      },
    ],
  },

  // --- Dynamic tenant site renderer (LAST) ---
  // /:slug → renders the home page for that tenant.
  // /:slug/:page → renders a specific page.
  {
    path: ':slug',
    loadComponent: () => import('./features/tenant-render/tenant-render.page').then((m) => m.TenantRenderPage),
  },
  {
    path: ':slug/:page',
    loadComponent: () => import('./features/tenant-render/tenant-render.page').then((m) => m.TenantRenderPage),
  },

  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
