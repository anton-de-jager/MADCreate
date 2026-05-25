import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AiService } from './ai.service';
import { QUEUE_AI } from '../../queue/queue.module';
import type { AIGenerateRequest } from '@madcreate/shared';

@Processor(QUEUE_AI)
export class AiGenerationProcessor extends WorkerHost {
  constructor(private readonly ai: AiService) {
    super();
  }

  async process(job: Job<{ generationId: string; request: AIGenerateRequest }>) {
    await this.ai.run(job.data.generationId, job.data.request);
  }
}
