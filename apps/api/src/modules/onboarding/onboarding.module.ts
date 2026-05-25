import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { TenantsModule } from '../tenants/tenants.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TenantsModule, AiModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
