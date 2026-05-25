import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MulterError } from 'multer';

import { AllExceptionsFilter } from './all-exceptions.filter';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function mockHost(url = '/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status };
  const req = { url, method: 'GET' };
  const ctx = {
    getResponse: () => res,
    getRequest: () => req,
  };
  const host = {
    switchToHttp: () => ctx,
  } as unknown as ArgumentsHost;
  return { host, status, json, req };
}

function makePrismaError(code: string, meta?: Record<string, unknown>): PrismaClientKnownRequestError {
  const err = new PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '5.0.0',
    meta,
  });
  return err;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  // =========================================================================
  // HttpException
  // =========================================================================

  describe('HttpException', () => {
    it('extracts status and string response', () => {
      const { host, status, json } = mockHost('/api/users');
      const exception = new HttpException('Not allowed', HttpStatus.FORBIDDEN);

      filter.catch(exception, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: expect.objectContaining({
            message: 'Not allowed',
            path: '/api/users',
          }),
        }),
      );
    });

    it('extracts message from object response', () => {
      const { host, json } = mockHost();
      const exception = new HttpException(
        { message: 'Validation failed', code: 'VALIDATION', details: { field: 'email' } },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe('Validation failed');
      expect(body.error.code).toBe('VALIDATION');
      expect(body.error.details).toEqual({ field: 'email' });
    });

    it('falls back to exception.message when object has no message', () => {
      const { host, json } = mockHost();
      const exception = new HttpException({ code: 'CUSTOM' }, HttpStatus.BAD_REQUEST);

      filter.catch(exception, host);

      const body = json.mock.calls[0][0];
      // NestJS HttpException.message is a stringified version; just verify it is truthy
      expect(body.error.message).toBeTruthy();
    });
  });

  // =========================================================================
  // MulterError
  // =========================================================================

  describe('MulterError', () => {
    it('maps LIMIT_FILE_SIZE to 413 Payload Too Large', () => {
      const { host, status, json } = mockHost();
      const err = new MulterError('LIMIT_FILE_SIZE');

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
      expect(body.error.message).toBe('File size exceeds 10 MB limit');
    });

    it('maps other MulterError codes to 400', () => {
      const { host, status, json } = mockHost();
      const err = new MulterError('LIMIT_UNEXPECTED_FILE');

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe('MULTER_ERROR');
    });
  });

  // =========================================================================
  // PrismaClientKnownRequestError
  // =========================================================================

  describe('PrismaClientKnownRequestError', () => {
    it('maps P2002 unique violation to 409 with target list', () => {
      const { host, status, json } = mockHost();
      const err = makePrismaError('P2002', { target: ['email'] });

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe('UNIQUE_VIOLATION');
      expect(body.error.message).toContain('email');
    });

    it('maps P2002 without targets to generic duplicate message', () => {
      const { host, json } = mockHost();
      const err = makePrismaError('P2002', {});

      filter.catch(err, host);

      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe('Duplicate record.');
    });

    it('maps P2025 to 404 Not Found', () => {
      const { host, status, json } = mockHost();
      const err = makePrismaError('P2025');

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Resource not found.');
    });

    it('maps P2003 foreign key violation to 400', () => {
      const { host, status, json } = mockHost();
      const err = makePrismaError('P2003');

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe('FOREIGN_KEY_VIOLATION');
      expect(body.error.message).toBe('Referenced resource does not exist.');
    });

    it('maps P2000 to field-too-long message', () => {
      const { host, json } = mockHost();
      const err = makePrismaError('P2000');

      filter.catch(err, host);

      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe('A field value was too long.');
    });

    it('maps P2014 to required-relation message', () => {
      const { host, json } = mockHost();
      const err = makePrismaError('P2014');

      filter.catch(err, host);

      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe('Action would break a required relation.');
    });

    it('maps unknown Prisma code to generic database message', () => {
      const { host, status, json } = mockHost();
      const err = makePrismaError('P9999');

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe('PRISMA_P9999');
      expect(body.error.message).toBe('Database request failed.');
    });
  });

  // =========================================================================
  // Generic Error
  // =========================================================================

  describe('generic Error', () => {
    it('returns 500 with the error message in non-production', () => {
      const { host, status, json } = mockHost();
      const err = new Error('Something broke');

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe('Something broke');
    });

    it('sanitizes message in production mode', () => {
      const prodFilter = new AllExceptionsFilter('production');
      const { host, json } = mockHost();
      const err = new Error('Secret DB details leaked');

      prodFilter.catch(err, host);

      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe('Internal server error');
    });
  });

  // =========================================================================
  // Unknown exception (not Error subclass)
  // =========================================================================

  describe('unknown exception (non-Error)', () => {
    it('returns 500 with generic message', () => {
      const { host, status, json } = mockHost();

      filter.catch('string-thrown', host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe('Internal server error');
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // =========================================================================
  // Response structure
  // =========================================================================

  describe('response structure', () => {
    it('always returns ok, error.code, error.message, error.path, error.timestamp', () => {
      const { host, json } = mockHost('/v1/test');
      const exception = new HttpException('test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, host);

      const body = json.mock.calls[0][0];
      expect(body).toHaveProperty('ok', false);
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('path', '/v1/test');
      expect(body.error).toHaveProperty('timestamp');
      // Timestamp should be a valid ISO string
      expect(new Date(body.error.timestamp).toISOString()).toBe(body.error.timestamp);
    });
  });

  // =========================================================================
  // Logging
  // =========================================================================

  describe('logging', () => {
    it('logs error for 5xx status codes', () => {
      const logSpy = jest.spyOn(filter['logger'], 'error').mockImplementation();
      const { host } = mockHost();
      const err = new Error('boom');

      filter.catch(err, host);

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('does not log error for 4xx status codes', () => {
      const logSpy = jest.spyOn(filter['logger'], 'error').mockImplementation();
      const { host } = mockHost();
      const exception = new HttpException('bad', HttpStatus.BAD_REQUEST);

      filter.catch(exception, host);

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
