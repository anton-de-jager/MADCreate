import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class LayoutsService {
  constructor(private readonly prisma: PrismaService, private readonly tenants: TenantsService) {}

  async list(userId: string, tenantId: string) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.layout.findMany({ where: { tenantId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
  }

  async get(userId: string, id: string) {
    const l = await this.prisma.layout.findFirst({ where: { id, deletedAt: null } });
    if (!l) throw new NotFoundException();
    await this.tenants.get(userId, l.tenantId);
    return l;
  }

  async create(userId: string, tenantId: string, dto: { name: string; schema: unknown; isDefault?: boolean }) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.layout.create({ data: { tenantId, name: dto.name, schema: dto.schema as Prisma.InputJsonValue, isDefault: !!dto.isDefault } });
  }

  async update(userId: string, id: string, patch: { name?: string; schema?: unknown; isDefault?: boolean }) {
    const l = await this.get(userId, id);
    const data: Prisma.LayoutUpdateInput = { ...patch, schema: patch.schema !== undefined ? (patch.schema as Prisma.InputJsonValue) : undefined };
    return this.prisma.layout.update({ where: { id: l.id }, data });
  }
}
