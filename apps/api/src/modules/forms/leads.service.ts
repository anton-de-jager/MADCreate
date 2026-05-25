import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  async list(userId: string, tenantId: string, opts: { status?: string; limit?: number } = {}) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.lead.findMany({
      where: { tenantId, deletedAt: null, ...(opts.status ? { status: opts.status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 200,
    });
  }

  async update(userId: string, tenantId: string, leadId: string, dto: UpdateLeadDto) {
    await this.tenants.get(userId, tenantId);
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');
    const data: Prisma.LeadUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.name   !== undefined) data.name   = dto.name;
    if (dto.email  !== undefined) data.email  = dto.email;
    if (dto.phone  !== undefined) data.phone  = dto.phone;
    return this.prisma.lead.update({ where: { id: leadId }, data });
  }

  async remove(userId: string, tenantId: string, leadId: string) {
    await this.tenants.get(userId, tenantId);
    await this.prisma.lead.update({ where: { id: leadId }, data: { deletedAt: new Date() } });
  }
}
