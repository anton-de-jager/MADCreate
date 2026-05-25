import { BadRequestException } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import type { JwtPayload } from '@madcreate/shared';

// ---------------------------------------------------------------------------
// Mock AiService interface
// ---------------------------------------------------------------------------

interface MockAiService {
  enqueue: jest.Mock;
  listGenerations: jest.Mock;
  getGeneration: jest.Mock;
  submitManualOutput: jest.Mock;
  onChange: jest.Mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAiService(): MockAiService {
  return {
    enqueue: jest.fn(),
    listGenerations: jest.fn(),
    getGeneration: jest.fn(),
    submitManualOutput: jest.fn(),
    onChange: jest.fn(),
  };
}

const jwtUser: JwtPayload = {
  sub: 'user-1',
  email: 'alice@example.com',
  wsid: 'ws-1',
  role: 'WORKSPACE_OWNER',
  superAdmin: false,
};

function makeController() {
  const ai = mockAiService();
  const ctrl = new AiController(ai as unknown as AiService);
  return { ctrl, ai };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AiController', () => {
  // =========================================================================
  // enqueue (POST /ai/generate)
  // =========================================================================

  describe('enqueue', () => {
    it('delegates to ai.enqueue with userId, tenantId, and dto', async () => {
      const { ctrl, ai } = makeController();
      const dto = { kind: 'SITE' as const, variables: { name: 'Test' } };
      const expected = { id: 'gen-1', status: 'PENDING' };
      ai.enqueue.mockResolvedValue(expected);

      const result = await ctrl.enqueue(jwtUser, 'tenant-1', dto);

      expect(ai.enqueue).toHaveBeenCalledWith('user-1', 'tenant-1', dto);
      expect(result).toBe(expected);
    });

    it('passes through the full dto including optional fields', async () => {
      const { ctrl, ai } = makeController();
      const dto = {
        kind: 'SECTION' as const,
        promptKey: 'hero-section',
        model: 'claude-3',
        variables: { color: 'blue' },
        systemPrompt: 'You are a designer',
        userPrompt: 'Create a hero',
        temperature: 0.7,
        maxTokens: 2000,
        jsonMode: true,
      };
      ai.enqueue.mockResolvedValue({ id: 'gen-2' });

      await ctrl.enqueue(jwtUser, 'tenant-2', dto);

      expect(ai.enqueue).toHaveBeenCalledWith('user-1', 'tenant-2', dto);
    });
  });

  // =========================================================================
  // list (GET /ai/generations)
  // =========================================================================

  describe('list', () => {
    it('delegates to ai.listGenerations with userId and tenantId', async () => {
      const { ctrl, ai } = makeController();
      const expected = [{ id: 'gen-1' }, { id: 'gen-2' }];
      ai.listGenerations.mockResolvedValue(expected);

      const result = await ctrl.list(jwtUser, 'tenant-1');

      expect(ai.listGenerations).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toBe(expected);
    });
  });

  // =========================================================================
  // get (GET /ai/generations/:id)
  // =========================================================================

  describe('get', () => {
    it('passes userId when request is not from a worker', async () => {
      const { ctrl, ai } = makeController();
      const expected = { id: 'gen-1', status: 'SUCCESS' };
      ai.getGeneration.mockResolvedValue(expected);
      const req = { worker: false };

      const result = await ctrl.get(jwtUser, 'gen-1', req as any);

      expect(ai.getGeneration).toHaveBeenCalledWith('user-1', 'gen-1');
      expect(result).toBe(expected);
    });

    it('passes undefined userId when request is from a worker', async () => {
      const { ctrl, ai } = makeController();
      const expected = { id: 'gen-1', status: 'SUCCESS' };
      ai.getGeneration.mockResolvedValue(expected);
      const req = { worker: true };

      const result = await ctrl.get(jwtUser, 'gen-1', req as any);

      expect(ai.getGeneration).toHaveBeenCalledWith(undefined, 'gen-1');
      expect(result).toBe(expected);
    });

    it('passes userId when req.worker is undefined', async () => {
      const { ctrl, ai } = makeController();
      ai.getGeneration.mockResolvedValue({ id: 'gen-1' });
      const req = {};

      await ctrl.get(jwtUser, 'gen-1', req as any);

      expect(ai.getGeneration).toHaveBeenCalledWith('user-1', 'gen-1');
    });
  });

  // =========================================================================
  // submit (POST /ai/generations/:id/submit)
  // =========================================================================

  describe('submit', () => {
    it('delegates with raw string payload for non-worker request', async () => {
      const { ctrl, ai } = makeController();
      const body = { raw: '{"sections":[]}' };
      const expected = { id: 'gen-1', status: 'SUCCESS' };
      ai.submitManualOutput.mockResolvedValue(expected);
      const req = { worker: false };

      const result = await ctrl.submit(jwtUser, 'gen-1', body as any, req as any);

      expect(ai.submitManualOutput).toHaveBeenCalledWith('user-1', 'gen-1', '{"sections":[]}');
      expect(result).toBe(expected);
    });

    it('delegates with json object payload', async () => {
      const { ctrl, ai } = makeController();
      const jsonPayload = { sections: [{ type: 'hero' }] };
      const body = { json: jsonPayload };
      ai.submitManualOutput.mockResolvedValue({ id: 'gen-1' });
      const req = { worker: false };

      await ctrl.submit(jwtUser, 'gen-1', body as any, req as any);

      expect(ai.submitManualOutput).toHaveBeenCalledWith('user-1', 'gen-1', jsonPayload);
    });

    it('prefers raw over json when both are provided', async () => {
      const { ctrl, ai } = makeController();
      const body = { raw: 'raw-string', json: { key: 'value' } };
      ai.submitManualOutput.mockResolvedValue({ id: 'gen-1' });
      const req = {};

      await ctrl.submit(jwtUser, 'gen-1', body as any, req as any);

      expect(ai.submitManualOutput).toHaveBeenCalledWith('user-1', 'gen-1', 'raw-string');
    });

    it('passes undefined userId when request is from a worker', async () => {
      const { ctrl, ai } = makeController();
      const body = { raw: 'data' };
      ai.submitManualOutput.mockResolvedValue({ id: 'gen-1' });
      const req = { worker: true };

      await ctrl.submit(jwtUser, 'gen-1', body as any, req as any);

      expect(ai.submitManualOutput).toHaveBeenCalledWith(undefined, 'gen-1', 'data');
    });

    it('throws BadRequestException when body has neither raw nor json', () => {
      const { ctrl } = makeController();
      const body = {};
      const req = {};

      expect(() => ctrl.submit(jwtUser, 'gen-1', body as any, req as any)).toThrow(BadRequestException);
      expect(() => ctrl.submit(jwtUser, 'gen-1', body as any, req as any)).toThrow(
        'Body must include either raw (string) or json (object).',
      );
    });

    it('throws BadRequestException when raw is null and json is undefined', () => {
      const { ctrl } = makeController();
      const body = { raw: null, json: undefined };
      const req = {};

      expect(() => ctrl.submit(jwtUser, 'gen-1', body as any, req as any)).toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // events (SSE /ai/events)
  // =========================================================================

  describe('events', () => {
    it('returns an Observable', () => {
      const { ctrl, ai } = makeController();
      ai.onChange.mockReturnValue(jest.fn());

      const result = ctrl.events();

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('calls ai.onChange when subscribed', () => {
      const { ctrl, ai } = makeController();
      const unsub = jest.fn();
      ai.onChange.mockReturnValue(unsub);

      const observable = ctrl.events();
      const subscription = observable.subscribe({ next: () => {} });

      expect(ai.onChange).toHaveBeenCalledTimes(1);
      expect(typeof ai.onChange.mock.calls[0][0]).toBe('function');

      subscription.unsubscribe();
    });

    it('emits message events when onChange listener is invoked', (done) => {
      const { ctrl, ai } = makeController();
      let capturedListener: () => void;
      ai.onChange.mockImplementation((fn: () => void) => {
        capturedListener = fn;
        return jest.fn();
      });

      const observable = ctrl.events();
      const events: any[] = [];

      const subscription = observable.subscribe({
        next: (event) => {
          events.push(event);
          if (events.length === 1) {
            expect(event.data).toBeDefined();
            expect(event.data.ts).toBeDefined();
            subscription.unsubscribe();
            done();
          }
        },
      });

      // Trigger the listener
      capturedListener!();
    });

    it('cleans up onChange and heartbeat interval on unsubscribe', () => {
      jest.useFakeTimers();
      const { ctrl, ai } = makeController();
      const unsub = jest.fn();
      ai.onChange.mockReturnValue(unsub);

      const observable = ctrl.events();
      const subscription = observable.subscribe({ next: () => {} });

      subscription.unsubscribe();

      expect(unsub).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('emits heartbeat events every 30 seconds', () => {
      jest.useFakeTimers();
      const { ctrl, ai } = makeController();
      ai.onChange.mockReturnValue(jest.fn());

      const observable = ctrl.events();
      const events: any[] = [];
      const subscription = observable.subscribe({ next: (e) => events.push(e) });

      jest.advanceTimersByTime(30_000);
      expect(events.length).toBe(1);
      expect(events[0].data.heartbeat).toBe(true);

      jest.advanceTimersByTime(30_000);
      expect(events.length).toBe(2);

      subscription.unsubscribe();
      jest.useRealTimers();
    });
  });
});
