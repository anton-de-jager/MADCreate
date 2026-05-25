import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { configuration, validateConfig } from './config/configuration';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { SitesModule } from './modules/sites/sites.module';
import { PagesModule } from './modules/pages/pages.module';
import { ThemesModule } from './modules/themes/themes.module';
import { LayoutsModule } from './modules/layouts/layouts.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { DomainsModule } from './modules/domains/domains.module';
import { AiModule } from './modules/ai/ai.module';
import { MediaModule } from './modules/media/media.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RenderModule } from './modules/render/render.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { BillingModule } from './modules/billing/billing.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { FormsModule } from './modules/forms/forms.module';
import { MailModule } from './modules/mail/mail.module';
import { StorageModule } from './modules/storage/storage.module';
import { CloudflareModule } from './modules/cloudflare/cloudflare.module';
import { ClaudeTasksModule } from './modules/claude-tasks/claude-tasks.module';
import { ClaudePromptTemplatesModule } from './modules/claude-prompt-templates/claude-prompt-templates.module';

import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
      cache: true,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('log.level', 'info'),
          transport:
            config.get<string>('nodeEnv') !== 'production' && config.get<boolean>('log.pretty', true)
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
          autoLogging: { ignore: (req) => (req.url ?? '').startsWith('/v1/health') },
          redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
        },
      }),
    }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 60_000, limit: 200 },
    ]),

    ScheduleModule.forRoot(),

    PrismaModule,
    RedisModule,
    QueueModule,
    MailModule,
    StorageModule,
    CloudflareModule,

    AuthModule,
    UsersModule,
    WorkspacesModule,
    TenantsModule,
    SitesModule,
    PagesModule,
    ThemesModule,
    LayoutsModule,
    TemplatesModule,
    IntegrationsModule,
    DeploymentsModule,
    DomainsModule,
    AiModule,
    MediaModule,
    AnalyticsModule,
    RenderModule,
    AdminModule,
    HealthModule,
    BillingModule,
    OnboardingModule,
    FormsModule,
    ClaudeTasksModule,
    ClaudePromptTemplatesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
