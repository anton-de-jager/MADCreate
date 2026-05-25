import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({ imports: [TenantsModule], controllers: [AnalyticsController], providers: [AnalyticsService] })
export class AnalyticsModule {}
