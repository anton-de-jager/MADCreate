import { WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AiService } from './ai.service';
import type { AIGenerateRequest } from '@madcreate/shared';
export declare class AiGenerationProcessor extends WorkerHost {
    private readonly ai;
    constructor(ai: AiService);
    process(job: Job<{
        generationId: string;
        request: AIGenerateRequest;
    }>): Promise<void>;
}
