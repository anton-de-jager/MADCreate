import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as dns } from 'node:dns';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { DomainStatus, DomainType } from '@prisma/client';
import type { DomainVerificationInstructions } from '@madcreate/shared';

@Injectable()
export class DomainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly config: ConfigService,
    private readonly cloudflare: CloudflareService,
  ) {}

  async list(userId: string, tenantId: string) {
    await this.tenants.get(userId, tenantId);
    return this.prisma.domain.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  async add(userId: string, tenantId: string, dto: { hostname: string; type: DomainType }) {
    await this.tenants.get(userId, tenantId);
    const hostname = dto.hostname.toLowerCase().trim();
    if (!/^[a-z0-9.\-*]+\.[a-z]{2,}$/.test(hostname)) throw new BadRequestException('Invalid hostname');

    const exists = await this.prisma.domain.findUnique({ where: { hostname } });
    if (exists) throw new BadRequestException('Domain already registered');

    const verifyToken = `madcreate-verify-${randomBytes(16).toString('hex')}`;
    const domain = await this.prisma.domain.create({
      data: {
        tenantId,
        hostname,
        type: dto.type,
        status: DomainStatus.PENDING,
        verifyToken,
      },
    });

    // Best-effort: if Cloudflare is configured AND the domain belongs to the
    // platform's CF zone, auto-create the CNAME + TXT records. The user can
    // still set them manually via the instructions endpoint either way.
    if (this.cloudflare.isConfigured() && (dto.type === 'CNAME' || dto.type === 'SUBDOMAIN')) {
      const platformHost = this.config.get<string>('web.publicDomain') ?? 'madcreate.madleads.ai';
      const { cnameId } = await this.cloudflare.wireCustomDomain(hostname, platformHost, verifyToken);
      if (cnameId) {
        await this.prisma.domain.update({
          where: { id: domain.id },
          data: { cloudflareId: cnameId, sslStatus: 'pending' },
        });
      }
      await this.cloudflare.ensureUniversalSsl().catch(() => undefined);
    }

    return domain;
  }

  async instructions(userId: string, id: string): Promise<DomainVerificationInstructions> {
    const d = await this.getOwned(userId, id);
    const apex = this.config.get<string>('web.publicDomain') ?? 'madcreate.madleads.ai';
    const records: DomainVerificationInstructions['records'] = [];

    if (d.type === 'CNAME' || d.type === 'SUBDOMAIN') {
      records.push({
        recordType: 'CNAME',
        name: d.hostname,
        value: apex,
        ttl: 300,
        explanation: `Point ${d.hostname} to the MADCreate ingress at ${apex}.`,
      });
    }
    if (d.type === 'APEX') {
      const apexIp = this.config.get<string>('web.apexIp')!;
      records.push({
        recordType: 'A',
        name: d.hostname,
        value: apexIp,
        ttl: 300,
        explanation: 'Apex domains require A records. Use ALIAS/ANAME at your DNS provider if available.',
      });
    }
    if (d.verifyToken) {
      records.push({
        recordType: 'TXT',
        name: `_madcreate.${d.hostname}`,
        value: d.verifyToken,
        ttl: 300,
        explanation: 'Proves ownership of this domain.',
      });
    }

    return { hostname: d.hostname, type: d.type, records, verifyToken: d.verifyToken ?? undefined };
  }

  async verify(userId: string, id: string) {
    const d = await this.getOwned(userId, id);
    try {
      const txtRecords = await dns.resolveTxt(`_madcreate.${d.hostname}`).catch(() => [] as string[][]);
      const flat = txtRecords.flat();
      const ok = !!d.verifyToken && flat.includes(d.verifyToken);
      const status = ok ? DomainStatus.ACTIVE : DomainStatus.FAILED;
      return this.prisma.domain.update({
        where: { id: d.id },
        data: {
          status,
          lastCheckedAt: new Date(),
          lastError: ok ? null : `TXT record for _madcreate.${d.hostname} did not match`,
          sslStatus: ok ? 'pending' : null,
        },
      });
    } catch (e) {
      return this.prisma.domain.update({
        where: { id: d.id },
        data: { status: DomainStatus.FAILED, lastCheckedAt: new Date(), lastError: (e as Error).message },
      });
    }
  }

  async remove(userId: string, id: string) {
    const d = await this.getOwned(userId, id);
    if (d.cloudflareId) await this.cloudflare.deleteRecord(d.cloudflareId).catch(() => undefined);
    return this.prisma.domain.update({ where: { id: d.id }, data: { deletedAt: new Date() } });
  }

  async resolveByHostname(hostname: string) {
    return this.prisma.domain.findFirst({
      where: { hostname: hostname.toLowerCase(), deletedAt: null, status: DomainStatus.ACTIVE },
      include: { tenant: { select: { id: true, slug: true, name: true } } },
    });
  }

  private async getOwned(userId: string, id: string) {
    const d = await this.prisma.domain.findFirst({ where: { id, deletedAt: null } });
    if (!d) throw new NotFoundException('Domain not found');
    await this.tenants.get(userId, d.tenantId);
    return d;
  }
}
