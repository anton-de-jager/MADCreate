"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookAdapter = void 0;
const common_1 = require("@nestjs/common");
let WebhookAdapter = class WebhookAdapter {
    async deploy(input) {
        const cfg = input.config;
        if (!cfg?.url)
            return { log: 'No webhook URL configured.' };
        const res = await fetch(cfg.url, {
            method: cfg.method ?? 'POST',
            headers: { 'content-type': 'application/json', ...(cfg.headers ?? {}) },
            body: JSON.stringify({ tenantId: input.tenantId, siteId: input.siteId, triggeredAt: new Date().toISOString() }),
        });
        const text = await res.text().catch(() => '');
        if (!res.ok)
            throw new Error(`Webhook responded ${res.status}: ${text.slice(0, 500)}`);
        return { log: `Webhook ${cfg.url} → ${res.status}`, artefactUrl: cfg.url };
    }
};
exports.WebhookAdapter = WebhookAdapter;
exports.WebhookAdapter = WebhookAdapter = __decorate([
    (0, common_1.Injectable)()
], WebhookAdapter);
//# sourceMappingURL=webhook.adapter.js.map