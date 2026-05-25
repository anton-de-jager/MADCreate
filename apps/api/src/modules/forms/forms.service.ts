import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { SubmitFormDto } from './dto/submit-form.dto';

/**
 * Type-safe helper to pull a string value out of a freeform data bag by
 * trying a list of candidate keys. Returns the first truthy string match,
 * or `null` if none found.
 */
function extractStringField(
  data: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const val = data[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  return null;
}

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  /**
   * Public form submission. Looks up tenant by id (the rendered site embeds
   * its own tenantId in the POST body). Creates a FormSubmission row and an
   * optional Lead row if the payload looks like contact info.
   */
  async submit(tenantId: string, dto: SubmitFormDto, req: Request) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const sub = await this.prisma.formSubmission.create({
      data: {
        tenantId: tenant.id,
        formKey: dto.formKey,
        pageSlug: dto.pageSlug ?? null,
        data: dto.data as Prisma.InputJsonValue,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent']?.toString().slice(0, 1000) ?? null,
      },
    });

    // Best-effort lead extraction. dto.email/phone/name override; else fish
    // them out of the freeform `data` object using common field names.
    const data = dto.data ?? {};
    const email = dto.email ?? extractStringField(data, 'email', 'Email');
    const phone = dto.phone ?? extractStringField(data, 'phone', 'tel');
    const name  = dto.name  ?? extractStringField(data, 'name', 'fullName');
    let leadId: string | null = null;
    if (email || phone) {
      const lead = await this.prisma.lead.create({
        data: {
          tenantId: tenant.id,
          email,
          phone,
          name,
          source: `form:${dto.formKey}`,
          status: 'new',
          data: { submissionId: sub.id } as Prisma.InputJsonValue,
        },
      });
      leadId = lead.id;
    }

    return { submissionId: sub.id, leadId };
  }

  async listSubmissions(userId: string, tenantId: string, limit = 100) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.formSubmission.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
