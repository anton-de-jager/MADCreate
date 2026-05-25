import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';

/**
 * Writes one AuditLog row per state-changing request that the operator
 * cares about. Pure observation: failures are swallowed so a flaky audit
 * write never breaks an actual request.
 *
 * Skipped:
 *   - GET/HEAD/OPTIONS (read-only — too noisy, not security-interesting)
 *   - /health (chatter), /auth/refresh, /claude-tasks/next (worker poll loop)
 *
 * Inference rules:
 *   - HTTP method → AuditAction (POST→CREATE, PATCH/PUT→UPDATE, DELETE→DELETE)
 *     with overrides for login/logout/invite/publish/generate/deploy URLs.
 *   - First path segment after the global prefix → entity.
 *   - tenantId / workspaceId pulled from query or body if present.
 *   - actor userId from req.user.sub (set by JwtAuthGuard); req.worker=true
 *     for the autonomous worker, captured in meta.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: { sub: string }; worker?: boolean }>();
    const method = req.method?.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next.handle();

    const url = req.originalUrl || req.url || '';
    if (isAuditSkip(url)) return next.handle();

    const action = inferAction(method, url);
    const entity = inferEntity(url);

    return next.handle().pipe(
      tap({
        next: () => {
          // Fire-and-forget; never block the response on an audit write.
          this.write({ req, action, entity }).catch((e) =>
            this.logger.warn(`Audit write failed: ${(e as Error).message}`),
          );
        },
        // No error branch — global filter handles failures; auditing the
        // attempt isn't worth the noise in the same table as state changes.
      }),
    );
  }

  private async write(args: {
    req: Request & { user?: { sub: string }; worker?: boolean };
    action: AuditAction;
    entity: string;
  }) {
    const { req, action, entity } = args;
    const userId = req.user?.sub ?? null;
    const query = req.query as Record<string, unknown>;
    const body = req.body as Record<string, unknown>;
    const tenantId =
      (typeof query.tenantId === 'string' ? query.tenantId : null) ??
      (typeof body.tenantId === 'string' ? body.tenantId : null);
    const workspaceId =
      (typeof query.workspaceId === 'string' ? query.workspaceId : null) ??
      (typeof body.workspaceId === 'string' ? body.workspaceId : null);

    await this.prisma.auditLog.create({
      data: {
        action,
        entity,
        userId,
        tenantId,
        workspaceId,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent']?.toString().slice(0, 1000) ?? null,
        meta: {
          method: req.method,
          path: req.originalUrl || req.url,
          worker: !!req.worker,
        } as Prisma.InputJsonValue,
      },
    });
  }
}

function isAuditSkip(url: string): boolean {
  if (url.includes('/health')) return true;
  if (url.includes('/auth/refresh')) return true;
  if (url.includes('/claude-tasks/next')) return true;
  return false;
}

function inferAction(method: string, url: string): AuditAction {
  if (/\/auth\/login/.test(url))  return AuditAction.LOGIN;
  if (/\/auth\/logout/.test(url)) return AuditAction.LOGOUT;
  if (/\/deploy/.test(url))       return AuditAction.DEPLOY;
  if (/\/invites?/.test(url))     return AuditAction.INVITE;
  if (/\/generate|\/ai\//.test(url)) return AuditAction.GENERATE;
  if (/publish/.test(url))        return AuditAction.PUBLISH;
  if (method === 'POST')   return AuditAction.CREATE;
  if (method === 'PATCH' || method === 'PUT') return AuditAction.UPDATE;
  if (method === 'DELETE') return AuditAction.DELETE;
  return AuditAction.UPDATE;
}

function inferEntity(url: string): string {
  // Strip query, split, drop global prefix ('v1'), take the first segment.
  const path = url.split('?')[0].replace(/^\/+/, '');
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'v1') segs.shift();
  return segs[0] ?? 'unknown';
}
