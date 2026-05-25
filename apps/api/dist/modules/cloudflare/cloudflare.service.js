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
var CloudflareService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let CloudflareService = CloudflareService_1 = class CloudflareService {
    config;
    logger = new common_1.Logger(CloudflareService_1.name);
    base = 'https://api.cloudflare.com/client/v4';
    constructor(config) {
        this.config = config;
    }
    creds() {
        const token = this.config.get('cloudflare.apiToken');
        const zoneId = this.config.get('cloudflare.zoneId');
        if (!token || !zoneId)
            return null;
        return { token, zoneId };
    }
    isConfigured() {
        return this.creds() !== null;
    }
    async upsertRecord(input) {
        const c = this.creds();
        if (!c)
            return null;
        const list = await this.api('GET', `/zones/${c.zoneId}/dns_records?type=${input.type}&name=${encodeURIComponent(input.name)}`, c.token);
        const existing = list?.result?.[0];
        const body = {
            type: input.type,
            name: input.name,
            content: input.content,
            ttl: input.ttl ?? 300,
            proxied: input.proxied ?? (input.type === 'CNAME' || input.type === 'A'),
        };
        if (existing) {
            const r = await this.api('PUT', `/zones/${c.zoneId}/dns_records/${existing.id}`, c.token, body);
            return r?.result?.id ?? null;
        }
        const r = await this.api('POST', `/zones/${c.zoneId}/dns_records`, c.token, body);
        return r?.result?.id ?? null;
    }
    async deleteRecord(recordId) {
        const c = this.creds();
        if (!c)
            return false;
        const r = await this.api('DELETE', `/zones/${c.zoneId}/dns_records/${recordId}`, c.token);
        return !!r?.success;
    }
    async wireCustomDomain(hostname, platformHost, verifyToken) {
        if (!this.isConfigured())
            return { cnameId: null, txtId: null };
        const [cnameId, txtId] = await Promise.all([
            this.upsertRecord({ type: 'CNAME', name: hostname, content: platformHost, proxied: true }),
            this.upsertRecord({ type: 'TXT', name: `_madcreate.${hostname}`, content: verifyToken, ttl: 120 }),
        ]);
        return { cnameId, txtId };
    }
    async ensureUniversalSsl() {
        const c = this.creds();
        if (!c)
            return false;
        const r = await this.api('PATCH', `/zones/${c.zoneId}/ssl/universal/settings`, c.token, { enabled: true });
        return !!r?.success;
    }
    async api(method, path, token, body) {
        try {
            const res = await fetch(`${this.base}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });
            const json = (await res.json());
            if (!res.ok || json.success === false) {
                this.logger.warn(`CF API ${method} ${path} failed: ${json.errors?.map((e) => e.message).join('; ') ?? res.status}`);
                return null;
            }
            return json;
        }
        catch (err) {
            this.logger.error(`CF API ${method} ${path} error: ${err.message}`);
            return null;
        }
    }
};
exports.CloudflareService = CloudflareService;
exports.CloudflareService = CloudflareService = CloudflareService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudflareService);
//# sourceMappingURL=cloudflare.service.js.map