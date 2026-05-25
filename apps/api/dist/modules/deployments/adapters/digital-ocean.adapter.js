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
var DigitalOceanAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalOceanAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let DigitalOceanAdapter = DigitalOceanAdapter_1 = class DigitalOceanAdapter {
    config;
    logger = new common_1.Logger(DigitalOceanAdapter_1.name);
    constructor(config) {
        this.config = config;
    }
    async deploy(input) {
        const cfg = this.resolveConfig(input.config?.digitalOcean);
        if (!cfg) {
            throw new Error('DigitalOcean not configured. Set DIGITALOCEAN_TOKEN + DIGITALOCEAN_APP_ID.');
        }
        const res = await fetch(`https://api.digitalocean.com/v2/apps/${cfg.appId}/deployments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ force_build: true }),
        });
        const json = await res.json();
        if (!res.ok)
            throw new Error(`DigitalOcean deploy failed: ${json.message ?? res.status}`);
        return {
            version: json.deployment?.id ?? json.id,
            log: `✓ DigitalOcean App Platform deployment ${json.deployment?.id} (phase: ${json.deployment?.phase}) for tenant ${input.tenantId}`,
        };
    }
    resolveConfig(s) {
        const cfg = {
            token: s?.token ?? this.config.get('deployments.digitalOcean.token') ?? '',
            appId: s?.appId ?? this.config.get('deployments.digitalOcean.appId') ?? '',
        };
        return cfg.token && cfg.appId ? cfg : null;
    }
};
exports.DigitalOceanAdapter = DigitalOceanAdapter;
exports.DigitalOceanAdapter = DigitalOceanAdapter = DigitalOceanAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DigitalOceanAdapter);
//# sourceMappingURL=digital-ocean.adapter.js.map