"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_dns_1 = require("node:dns");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
const client_1 = require("@prisma/client");
let DomainsService = class DomainsService {
    prisma;
    tenants;
    config;
    cloudflare;
    constructor(prisma, tenants, config, cloudflare) {
        this.prisma = prisma;
        this.tenants = tenants;
        this.config = config;
        this.cloudflare = cloudflare;
    }
    async list(userId, tenantId) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.domain.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
    }
    async add(userId, tenantId, dto) {
        await this.tenants.get(userId, tenantId);
        const hostname = dto.hostname.toLowerCase().trim();
        if (!/^[a-z0-9.\-*]+\.[a-z]{2,}$/.test(hostname))
            throw new common_1.BadRequestException('Invalid hostname');
        const exists = await this.prisma.domain.findUnique({ where: { hostname } });
        if (exists)
            throw new common_1.BadRequestException('Domain already registered');
        const verifyToken = `madcreate-verify-${(0, node_crypto_1.randomBytes)(16).toString('hex')}`;
        const domain = await this.prisma.domain.create({
            data: {
                tenantId,
                hostname,
                type: dto.type,
                status: client_1.DomainStatus.PENDING,
                verifyToken,
            },
        });
        if (this.cloudflare.isConfigured() && (dto.type === 'CNAME' || dto.type === 'SUBDOMAIN')) {
            const platformHost = this.config.get('web.publicDomain') ?? 'madcreate.madleads.ai';
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
    async instructions(userId, id) {
        const d = await this.getOwned(userId, id);
        const apex = this.config.get('web.publicDomain') ?? 'madcreate.madleads.ai';
        const records = [];
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
            const apexIp = this.config.get('web.apexIp');
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
    async verify(userId, id) {
        const d = await this.getOwned(userId, id);
        try {
            const txtRecords = await node_dns_1.promises.resolveTxt(`_madcreate.${d.hostname}`).catch(() => []);
            const flat = txtRecords.flat();
            const ok = !!d.verifyToken && flat.includes(d.verifyToken);
            const status = ok ? client_1.DomainStatus.ACTIVE : client_1.DomainStatus.FAILED;
            return this.prisma.domain.update({
                where: { id: d.id },
                data: {
                    status,
                    lastCheckedAt: new Date(),
                    lastError: ok ? null : `TXT record for _madcreate.${d.hostname} did not match`,
                    sslStatus: ok ? 'pending' : null,
                },
            });
        }
        catch (e) {
            return this.prisma.domain.update({
                where: { id: d.id },
                data: { status: client_1.DomainStatus.FAILED, lastCheckedAt: new Date(), lastError: e.message },
            });
        }
    }
    async remove(userId, id) {
        const d = await this.getOwned(userId, id);
        if (d.cloudflareId)
            await this.cloudflare.deleteRecord(d.cloudflareId).catch(() => undefined);
        return this.prisma.domain.update({ where: { id: d.id }, data: { deletedAt: new Date() } });
    }
    async resolveByHostname(hostname) {
        return this.prisma.domain.findFirst({
            where: { hostname: hostname.toLowerCase(), deletedAt: null, status: client_1.DomainStatus.ACTIVE },
            include: { tenant: { select: { id: true, slug: true, name: true } } },
        });
    }
    async getOwned(userId, id) {
        const d = await this.prisma.domain.findFirst({ where: { id, deletedAt: null } });
        if (!d)
            throw new common_1.NotFoundException('Domain not found');
        await this.tenants.get(userId, d.tenantId);
        return d;
    }
};
exports.DomainsService = DomainsService;
exports.DomainsService = DomainsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenants_service_1.TenantsService,
        config_1.ConfigService,
        cloudflare_service_1.CloudflareService])
], DomainsService);
//# sourceMappingURL=domains.service.js.map