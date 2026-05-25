import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

function makeInterceptor() {
  return new ResponseInterceptor();
}

function mockExecutionContext(): ExecutionContext {
  return {} as ExecutionContext;
}

function mockCallHandler(data: unknown): CallHandler {
  return { handle: () => of(data) };
}

describe('ResponseInterceptor', () => {
  // -----------------------------------------------------------------------
  // Normal wrapping
  // -----------------------------------------------------------------------
  describe('normal wrapping', () => {
    it('wraps a plain object in { ok: true, data: ... }', async () => {
      const interceptor = makeInterceptor();
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler({ id: 1, name: 'test' })),
      );
      expect(result).toEqual({ ok: true, data: { id: 1, name: 'test' } });
    });

    it('wraps an array in { ok: true, data: [...] }', async () => {
      const interceptor = makeInterceptor();
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler([1, 2, 3])),
      );
      expect(result).toEqual({ ok: true, data: [1, 2, 3] });
    });

    it('wraps a string in { ok: true, data: ... }', async () => {
      const interceptor = makeInterceptor();
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler('hello')),
      );
      expect(result).toEqual({ ok: true, data: 'hello' });
    });

    it('wraps a number in { ok: true, data: ... }', async () => {
      const interceptor = makeInterceptor();
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler(42)),
      );
      expect(result).toEqual({ ok: true, data: 42 });
    });

    it('wraps a boolean in { ok: true, data: ... }', async () => {
      const interceptor = makeInterceptor();
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler(false)),
      );
      expect(result).toEqual({ ok: true, data: false });
    });
  });

  // -----------------------------------------------------------------------
  // Undefined / null data
  // -----------------------------------------------------------------------
  describe('undefined and null data', () => {
    it('converts undefined to { ok: true, data: null }', async () => {
      const interceptor = makeInterceptor();
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler(undefined)),
      );
      expect(result).toEqual({ ok: true, data: null });
    });

    it('wraps null in { ok: true, data: null }', async () => {
      const interceptor = makeInterceptor();
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler(null)),
      );
      expect(result).toEqual({ ok: true, data: null });
    });
  });

  // -----------------------------------------------------------------------
  // Already-wrapped responses (objects with `ok` property)
  // -----------------------------------------------------------------------
  describe('already-wrapped responses', () => {
    it('does not double-wrap an object that already has an ok property', async () => {
      const interceptor = makeInterceptor();
      const alreadyWrapped = { ok: true, data: { id: 1 } };
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler(alreadyWrapped)),
      );
      expect(result).toBe(alreadyWrapped);
    });

    it('does not double-wrap an error-shaped response with ok: false', async () => {
      const interceptor = makeInterceptor();
      const errorResponse = { ok: false, error: 'something went wrong' };
      const result = await lastValueFrom(
        interceptor.intercept(mockExecutionContext(), mockCallHandler(errorResponse)),
      );
      expect(result).toBe(errorResponse);
    });
  });
});
