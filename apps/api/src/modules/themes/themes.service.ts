import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ThemesService {
  constructor(private readonly prisma: PrismaService, private readonly tenants: TenantsService) {}

  async list(userId: string, tenantId: string) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.theme.findMany({ where: { tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
  }

  async get(userId: string, themeId: string) {
    const t = await this.prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
    if (!t) throw new NotFoundException('Theme not found');
    await this.tenants.get(userId, t.tenantId);
    return t;
  }

  async create(userId: string, tenantId: string, dto: { name: string; tokens: unknown }) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.theme.create({ data: { tenantId, name: dto.name, tokens: dto.tokens as Prisma.InputJsonValue } });
  }

  async update(userId: string, themeId: string, patch: { name?: string; tokens?: unknown; isActive?: boolean }) {
    const t = await this.get(userId, themeId);
    if (patch.isActive) {
      // Only one active theme per tenant
      await this.prisma.theme.updateMany({ where: { tenantId: t.tenantId, isActive: true }, data: { isActive: false } });
    }
    return this.prisma.theme.update({
      where: { id: t.id },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.tokens !== undefined && { tokens: patch.tokens as Prisma.InputJsonValue }),
        ...(patch.isActive !== undefined && { isActive: patch.isActive }),
      },
    });
  }

  async remove(userId: string, themeId: string) {
    const t = await this.get(userId, themeId);
    return this.prisma.theme.update({ where: { id: t.id }, data: { deletedAt: new Date() } });
  }
}
