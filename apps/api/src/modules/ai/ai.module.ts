import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ClaudeCodeManualProvider } from './providers/claude-code-manual.provider';
import { SiteApplicatorService } from './site-applicator.service';
import { AiGenerationProcessor } from './ai-generation.processor';
import { TenantsModule } from '../tenants/tenants.module';
import { QUEUE_AI } from '../../queue/queue.module';

@Module({
  imports: [TenantsModule, BullModule.registerQueue({ name: QUEUE_AI })],
  controllers: [AiController],
  providers: [
    AiService,
    ClaudeCodeManualProvider,
    SiteApplicatorService,
    AiGenerationProcessor,
  ],
  exports: [AiService],
})
export class AiModule {}
