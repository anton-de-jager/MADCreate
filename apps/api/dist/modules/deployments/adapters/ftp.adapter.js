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
var FtpAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FtpAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const ftp = __importStar(require("basic-ftp"));
const static_export_adapter_1 = require("./static-export.adapter");
let FtpAdapter = FtpAdapter_1 = class FtpAdapter {
    configService;
    staticExport;
    logger = new common_1.Logger(FtpAdapter_1.name);
    constructor(configService, staticExport) {
        this.configService = configService;
        this.staticExport = staticExport;
    }
    async deploy(input) {
        const cfg = this.resolveConfig(input.config?.ftp);
        if (!cfg) {
            throw new Error('FTP not configured. Provide deployment.config.ftp ({ host, user, password, remotePath }) ' +
                'or set FTP_HOST / FTP_USER / FTP_PASS / FTP_REMOTE_PATH in the environment.');
        }
        const exportResult = await this.staticExport.deploy(input);
        const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
        if (!localDir)
            throw new Error('Static export produced no local artefact to upload.');
        const client = new ftp.Client(30_000);
        client.ftp.verbose = false;
        const logLines = [exportResult.log ?? ''];
        try {
            await client.access({
                host: cfg.host,
                port: cfg.port ?? 21,
                user: cfg.user,
                password: cfg.password,
                secure: cfg.secure ?? false,
            });
            logLines.push(`✓ Connected to ftp${cfg.secure ? 's' : ''}://${cfg.host}:${cfg.port ?? 21}`);
            const remotePath = `${cfg.remotePath.replace(/\/+$/, '')}/${input.tenantId}`;
            await client.ensureDir(remotePath);
            await client.clearWorkingDir().catch(() => undefined);
            await client.uploadFromDir(localDir);
            const stats = await this.summarize(localDir);
            logLines.push(`✓ Uploaded ${stats.files} files (${(stats.bytes / 1024).toFixed(1)} KB) → ${cfg.host}:${remotePath}`);
            return {
                artefactUrl: `ftp${cfg.secure ? 's' : ''}://${cfg.user}@${cfg.host}${remotePath}`,
                log: logLines.filter(Boolean).join('\n'),
                version: String(Date.now()),
            };
        }
        finally {
            client.close();
        }
    }
    async summarize(dir) {
        let files = 0, bytes = 0;
        for (const e of await node_fs_1.promises.readdir(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) {
                const s = await this.summarize(p);
                files += s.files;
                bytes += s.bytes;
            }
            else {
                const s = await node_fs_1.promises.stat(p);
                files += 1;
                bytes += s.size;
            }
        }
        return { files, bytes };
    }
    resolveConfig(supplied) {
        const cfg = {
            host: supplied?.host ?? this.configService.get('deployments.ftp.host') ?? '',
            port: supplied?.port ?? this.configService.get('deployments.ftp.port') ?? 21,
            user: supplied?.user ?? this.configService.get('deployments.ftp.user') ?? '',
            password: supplied?.password ?? this.configService.get('deployments.ftp.pass') ?? '',
            remotePath: supplied?.remotePath ?? this.configService.get('deployments.ftp.remotePath') ?? '',
            secure: supplied?.secure ?? false,
        };
        if (!cfg.host || !cfg.user || !cfg.password || !cfg.remotePath)
            return null;
        return cfg;
    }
};
exports.FtpAdapter = FtpAdapter;
exports.FtpAdapter = FtpAdapter = FtpAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        static_export_adapter_1.StaticExportAdapter])
], FtpAdapter);
//# sourceMappingURL=ftp.adapter.js.map