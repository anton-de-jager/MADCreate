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
var VercelAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VercelAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const static_export_adapter_1 = require("./static-export.adapter");
let VercelAdapter = VercelAdapter_1 = class VercelAdapter {
    config;
    staticExport;
    logger = new common_1.Logger(VercelAdapter_1.name);
    constructor(config, staticExport) {
        this.config = config;
        this.staticExport = staticExport;
    }
    async deploy(input) {
        const cfg = this.resolveConfig(input.config?.vercel);
        if (!cfg) {
            throw new Error('Vercel not configured. Set VERCEL_TOKEN + VERCEL_PROJECT_ID.');
        }
        const exportResult = await this.staticExport.deploy(input);
        const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
        if (!localDir)
            throw new Error('Static export produced no local artefact.');
        const files = await this.collectFiles(localDir);
        const teamQ = cfg.teamId ? `?teamId=${cfg.teamId}` : '';
        const uploaded = [];
        for (const f of files) {
            const sha = (0, node_crypto_1.createHash)('sha1').update(f.bytes).digest('hex');
            const res = await fetch(`https://api.vercel.com/v2/files${teamQ}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${cfg.token}`,
                    'Content-Type': 'application/octet-stream',
                    'x-vercel-digest': sha,
                },
                body: new Uint8Array(f.bytes),
            });
            if (!res.ok)
                throw new Error(`Vercel upload failed for ${f.relPath}: ${res.status}`);
            uploaded.push({ file: f.relPath, sha, size: f.bytes.length });
        }
        const deployRes = await fetch(`https://api.vercel.com/v13/deployments${teamQ}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `madcreate-${input.tenantId}`,
                project: cfg.projectId,
                target: 'production',
                files: uploaded.map((u) => ({ file: u.file, sha: u.sha, size: u.size })),
            }),
        });
        const dep = await deployRes.json();
        if (!deployRes.ok)
            throw new Error(`Vercel deploy failed: ${dep.error?.message ?? deployRes.status}`);
        return {
            artefactUrl: dep.url ? `https://${dep.url}` : undefined,
            version: dep.id,
            log: `${exportResult.log ?? ''}\n✓ Vercel deployment ${dep.id} → https://${dep.url}`,
        };
    }
    async collectFiles(dir, base = dir) {
        const out = [];
        for (const entry of await node_fs_1.promises.readdir(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory())
                out.push(...(await this.collectFiles(full, base)));
            else
                out.push({ relPath: path.relative(base, full).split(path.sep).join('/'), bytes: await node_fs_1.promises.readFile(full) });
        }
        return out;
    }
    resolveConfig(s) {
        const cfg = {
            token: s?.token ?? this.config.get('deployments.vercel.token') ?? '',
            projectId: s?.projectId ?? this.config.get('deployments.vercel.projectId') ?? '',
            teamId: s?.teamId ?? this.config.get('deployments.vercel.teamId') ?? undefined,
        };
        return cfg.token && cfg.projectId ? cfg : null;
    }
};
exports.VercelAdapter = VercelAdapter;
exports.VercelAdapter = VercelAdapter = VercelAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        static_export_adapter_1.StaticExportAdapter])
], VercelAdapter);
//# sourceMappingURL=vercel.adapter.js.map