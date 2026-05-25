"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const nestjs_pino_1 = require("nestjs-pino");
const core_1 = require("@nestjs/core");
const configuration_1 = require("./config/configuration");
const prisma_module_1 = require("./prisma/prisma.module");
const redis_module_1 = require("./redis/redis.module");
const queue_module_1 = require("./queue/queue.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const workspaces_module_1 = require("./modules/workspaces/workspaces.module");
const tenants_module_1 = require("./modules/tenants/tenants.module");
const sites_module_1 = require("./modules/sites/sites.module");
const pages_module_1 = require("./modules/pages/pages.module");
const themes_module_1 = require("./modules/themes/themes.module");
const layouts_module_1 = require("./modules/layouts/layouts.module");
const templates_module_1 = require("./modules/templates/templates.module");
const integrations_module_1 = require("./modules/integrations/integrations.module");
const deployments_module_1 = require("./modules/deployments/deployments.module");
const domains_module_1 = require("./modules/domains/domains.module");
const ai_module_1 = require("./modules/ai/ai.module");
const media_module_1 = require("./modules/media/media.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const render_module_1 = require("./modules/render/render.module");
const admin_module_1 = require("./modules/admin/admin.module");
const health_module_1 = require("./modules/health/health.module");
const billing_module_1 = require("./modules/billing/billing.module");
const onboarding_module_1 = require("./modules/onboarding/onboarding.module");
const forms_module_1 = require("./modules/forms/forms.module");
const mail_module_1 = require("./modules/mail/mail.module");
const storage_module_1 = require("./modules/storage/storage.module");
const cloudflare_module_1 = require("./modules/cloudflare/cloudflare.module");
const claude_tasks_module_1 = require("./modules/claude-tasks/claude-tasks.module");
const claude_prompt_templates_module_1 = require("./modules/claude-prompt-templates/claude-prompt-templates.module");
const audit_interceptor_1 = require("./common/interceptors/audit.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.configuration],
                validate: configuration_1.validateConfig,
                cache: true,
            }),
            nestjs_pino_1.LoggerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    pinoHttp: {
                        level: config.get('log.level', 'info'),
                        transport: config.get('nodeEnv') !== 'production' && config.get('log.pretty', true)
                            ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
                            : undefined,
                        autoLogging: { ignore: (req) => (req.url ?? '').startsWith('/v1/health') },
                        redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
                    },
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'short', ttl: 1000, limit: 20 },
                { name: 'medium', ttl: 60_000, limit: 200 },
            ]),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            queue_module_1.QueueModule,
            mail_module_1.MailModule,
            storage_module_1.StorageModule,
            cloudflare_module_1.CloudflareModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            workspaces_module_1.WorkspacesModule,
            tenants_module_1.TenantsModule,
            sites_module_1.SitesModule,
            pages_module_1.PagesModule,
            themes_module_1.ThemesModule,
            layouts_module_1.LayoutsModule,
            templates_module_1.TemplatesModule,
            integrations_module_1.IntegrationsModule,
            deployments_module_1.DeploymentsModule,
            domains_module_1.DomainsModule,
            ai_module_1.AiModule,
            media_module_1.MediaModule,
            analytics_module_1.AnalyticsModule,
            render_module_1.RenderModule,
            admin_module_1.AdminModule,
            health_module_1.HealthModule,
            billing_module_1.BillingModule,
            onboarding_module_1.OnboardingModule,
            forms_module_1.FormsModule,
            claude_tasks_module_1.ClaudeTasksModule,
            claude_prompt_templates_module_1.ClaudePromptTemplatesModule,
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: audit_interceptor_1.AuditInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map