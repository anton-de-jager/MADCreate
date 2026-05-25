import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly nodeEnv?: string) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message: string = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') {
        message = r;
      } else if (r && typeof r === 'object') {
        const obj = r as Record<string, unknown>;
        message = (obj.message as string) ?? exception.message;
        code = (obj.code as string) ?? exception.name?.replace(/Exception$/, '').toUpperCase() ?? code;
        details = obj.details;
      }
    } else if (exception instanceof MulterError) {
      if (exception.code === 'LIMIT_FILE_SIZE') {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        code = 'PAYLOAD_TOO_LARGE';
        message = 'File size exceeds 10 MB limit';
      } else {
        status = HttpStatus.BAD_REQUEST;
        code = 'MULTER_ERROR';
        message = exception.message;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      // Map Prisma codes to friendly HTTP statuses + generic messages so we
      // never leak table or constraint names to the client. Full Prisma
      // message still gets logged below for ≥500-class issues.
      status = HttpStatus.BAD_REQUEST;
      code = `PRISMA_${exception.code}`;
      const meta = exception.meta as Record<string, unknown> | undefined;
      const targets = ((meta?.target ?? []) as string[] | string);
      const targetList = Array.isArray(targets) ? targets : (targets ? [targets] : []);
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          code = 'UNIQUE_VIOLATION';
          message = targetList.length
            ? `A record with this ${targetList.join(' + ')} already exists.`
            : 'Duplicate record.';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          code = 'NOT_FOUND';
          message = 'Resource not found.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          code = 'FOREIGN_KEY_VIOLATION';
          message = 'Referenced resource does not exist.';
          break;
        case 'P2000':
          message = 'A field value was too long.';
          break;
        case 'P2014':
          message = 'Action would break a required relation.';
          break;
        default:
          message = 'Database request failed.';
      }
    } else if (exception instanceof Error) {
      // Generic Error - message bubbles through in dev, but in production
      // anything that's not an HttpException or known Prisma error becomes
      // a sanitized 500 to avoid leaking framework internals.
      if (this.nodeEnv === 'production') {
        message = 'Internal server error';
      } else {
        message = exception.message;
      }
    }

    if (status >= 500) {
      this.logger.error({ err: exception, path: req.url, method: req.method }, message);
    }

    res.status(status).json({
      ok: false,
      error: { code, message, details, path: req.url, timestamp: new Date().toISOString() },
    });
  }
}
