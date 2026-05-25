import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: { id: string; slug: string; workspaceId: string };
  }
}

// Resolves a tenant from either:
//   1. X-Tenant-Id / X-Tenant-Slug header (preferred for authenticated apps)
//   2. Hostname mapping via the Domain table (for custom domains)
//
// Public routes that don't need a tenant simply ignore the absence.
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const headerId = req.header('x-tenant-id');
      const headerSlug = req.header('x-tenant-slug');
      const host = (req.header('x-forwarded-host') ?? req.header('host') ?? '').split(':')[0].toLowerCase();

      let tenant: { id: string; slug: string; workspaceId: string } | null = null;

      if (headerId) {
        const t = await this.prisma.tenant.findFirst({
          where: { id: headerId, deletedAt: null },
          select: { id: true, slug: true, workspaceId: true },
        });
        if (t) tenant = t;
      } else if (headerSlug) {
        const t = await this.prisma.tenant.findFirst({
          where: { slug: headerSlug, deletedAt: null },
          select: { id: true, slug: true, workspaceId: true },
        });
        if (t) tenant = t;
      } else if (host) {
        const domain = await this.prisma.domain.findUnique({
          where: { hostname: host },
          select: { tenant: { select: { id: true, slug: true, workspaceId: true } } },
        });
        if (domain?.tenant) tenant = domain.tenant;
      }

      if (tenant) req.tenant = tenant;
    } catch {
      // Resolution failure shouldn't block the request; downstream code
      // can require tenant presence where it matters.
    }
    next();
  }
}
