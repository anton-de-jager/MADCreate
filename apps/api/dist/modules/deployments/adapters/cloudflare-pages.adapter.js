"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CloudflarePagesAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflarePagesAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const static_export_adapter_1 = require("./static-export.adapter");
let CloudflarePagesAdapter = CloudflarePagesAdapter_1 = class CloudflarePagesAdapter {
    config;
    staticExport;
    logger = new common_1.Logger(CloudflarePagesAdapter_1.name);
    constructor(config, staticExport) {
        this.config = config;
        this.staticExport = staticExport;
    }
    async deploy(input) {
        const cfg = this.resolveConfig(input.config?.cloudflare);
        if (!cfg) {
            throw new Error('Cloudflare Pages not configured. Provide deployment.config.cloudflare ({ accountId, projectName }) ' +
                'or set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_PROJECT_NAME, with CLOUDFLARE_API_TOKEN.');
        }
        const exportResult = await this.staticExport.deploy(input);
        const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
        if (!localDir)
            throw new Error('Static export produced no local artefact.');
        const files = await this.collectFiles(localDir);
        const form = new FormData();
        for (const f of files) {
            form.append(f.relPath, new Blob([new Uint8Array(f.bytes)], { type: f.contentType }), f.relPath);
        }
        form.append('manifest', JSON.stringify({}));
        const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/pages/projects/${cfg.projectName}/deployments`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfg.apiToken}` },
            body: form,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            const msg = json.errors?.map((e) => e.message).join('; ') ?? `HTTP ${res.status}`;
            throw new Error(`Cloudflare Pages upload failed: ${msg}`);
        }
        return {
            artefactUrl: json.result?.url ?? undefined,
            version: json.result?.id ?? undefined,
            log: `${exportResult.log ?? ''}\n✓ Cloudflare Pages deployment ${json.result?.id} → ${json.result?.url}`,
        };
    }
    async collectFiles(dir, base = dir) {
        const out = [];
        for (const entry of await node_fs_1.promises.readdir(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory())
                out.push(...(await this.collectFiles(full, base)));
            else {
                const rel = path.relative(base, full).split(path.sep).join('/');
                out.push({ relPath: rel, bytes: await node_fs_1.promises.readFile(full), contentType: guessType(rel) });
            }
        }
        return out;
    }
    resolveConfig(s) {
        const cfg = {
            apiToken: s?.apiToken ?? this.config.get('deployments.cloudflarePages.apiToken') ?? '',
            accountId: s?.accountId ?? this.config.get('deployments.cloudflarePages.accountId') ?? '',
            projectName: s?.projectName ?? this.config.get('deployments.cloudflarePages.projectName') ?? '',
        };
        return cfg.apiToken && cfg.accountId && cfg.projectName ? cfg : null;
    }
};
exports.CloudflarePagesAdapter = CloudflarePagesAdapter;
exports.CloudflarePagesAdapter = CloudflarePagesAdapter = CloudflarePagesAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        static_export_adapter_1.StaticExportAdapter])
], CloudflarePagesAdapter);
function guessType(p) {
    const ext = path.extname(p).toLowerCase();
    return ({
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
        '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain',
        '.xml': 'application/xml', '.map': 'application/json',
    }[ext]) ?? 'application/octet-stream';
}
//# sourceMappingURL=cloudflare-pages.adapter.js.map