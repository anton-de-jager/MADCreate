import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService, private readonly tenants: TenantsService) {}

  catalog() {
    return this.prisma.integrationCatalog.findMany({ where: { isEnabled: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }

  async installed(userId: string, tenantId: string) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.tenantIntegration.findMany({
      where: { tenantId, deletedAt: null },
      include: { catalog: true },
    });
  }

  async install(userId: string, tenantId: string, dto: { catalogKey: string; config?: Record<string, unknown> }) {
    await this.tenants.get(userId, tenantId);
    const catalog = await this.prisma.integrationCatalog.findUnique({ where: { key: dto.catalogKey } });
    if (!catalog) throw new NotFoundException('Integration not in catalog');
    return this.prisma.tenantIntegration.upsert({
      where: { tenantId_catalogId: { tenantId, catalogId: catalog.id } },
      update: { config: (dto.config ?? {}) as Prisma.InputJsonValue, isEnabled: true, deletedAt: null },
      create: { tenantId, catalogId: catalog.id, config: (dto.config ?? {}) as Prisma.InputJsonValue },
    });
  }

  async uninstall(userId: string, tenantId: string, id: string) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.tenantIntegration.update({ where: { id }, data: { deletedAt: new Date(), isEnabled: false } });
  }
}
