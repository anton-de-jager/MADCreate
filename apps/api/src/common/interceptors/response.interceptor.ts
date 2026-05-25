import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

// Wraps all successful responses in { ok: true, data: ... } shape.
// Exceptions are formatted by AllExceptionsFilter into { ok: false, error: ... }.
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Don't double-wrap streams/buffers.
        if (data === undefined) return { ok: true, data: null };
        if (data && typeof data === 'object' && 'ok' in (data as Record<string, unknown>)) return data;
        return { ok: true, data };
      }),
    );
  }
}
