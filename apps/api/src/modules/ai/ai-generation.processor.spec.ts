import { AiGenerationProcessor } from './ai-generation.processor';
import type { AiService } from './ai.service';
import type { Job } from 'bullmq';
import type { AIGenerateRequest } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProcessor() {
  const aiService: { run: jest.Mock } = {
    run: jest.fn(),
  };

  const processor = new AiGenerationProcessor(
    aiService as unknown as AiService,
  );

  return { processor, aiService };
}

function fakeJob(
  generationId = 'gen-1',
  request: AIGenerateRequest = { prompt: 'hello' } as unknown as AIGenerateRequest,
) {
  return {
    data: { generationId, request },
  } as Job<{ generationId: string; request: AIGenerateRequest }>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AiGenerationProcessor', () => {
  describe('process – happy path', () => {
    it('calls aiService.run() with generationId and request from job data', async () => {
      const { processor, aiService } = makeProcessor();
      aiService.run.mockResolvedValue(undefined);

      const request = { prompt: 'generate something' } as unknown as AIGenerateRequest;
      const job = fakeJob('gen-42', request);

      await processor.process(job);

      expect(aiService.run).toHaveBeenCalledTimes(1);
      expect(aiService.run).toHaveBeenCalledWith('gen-42', request);
    });
  });

  describe('process – error handling', () => {
    it('propagates errors thrown by aiService.run()', async () => {
      const { processor, aiService } = makeProcessor();
      const error = new Error('AI generation failed');
      aiService.run.mockRejectedValue(error);

      await expect(processor.process(fakeJob())).rejects.toThrow(
        'AI generation failed',
      );

      expect(aiService.run).toHaveBeenCalledTimes(1);
    });
  });
});
