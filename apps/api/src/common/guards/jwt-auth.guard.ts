import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();

    // Worker-token bypass: the autonomous /claude worker runs without a user
    // JWT. It presents a long-lived secret in X-Worker-Token. We compare in
    // constant time and tag the request as `worker = true` so handlers can
    // distinguish if they care.
    const presented = req.headers?.['x-worker-token'];
    const expected  = this.configService.get<string>('claude.workerToken');
    if (typeof presented === 'string' && expected && safeEqual(presented, expected)) {
      req.worker = true;
      return true;
    }

    // SSE / EventSource connections cannot set custom headers. Accept the JWT
    // as a query parameter (?token=<jwt>) and copy it into the Authorization
    // header so Passport's default JWT strategy picks it up transparently.
    const qToken = req.query?.token;
    if (typeof qToken === 'string' && qToken && !req.headers?.authorization) {
      req.headers.authorization = `Bearer ${qToken}`;
    }

    return super.canActivate(context);
  }
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
