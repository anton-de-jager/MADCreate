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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SftpAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SftpAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
const static_export_adapter_1 = require("./static-export.adapter");
let SftpAdapter = SftpAdapter_1 = class SftpAdapter {
    config;
    staticExport;
    logger = new common_1.Logger(SftpAdapter_1.name);
    constructor(config, staticExport) {
        this.config = config;
        this.staticExport = staticExport;
    }
    async deploy(input) {
        const sftpConfig = this.resolveConfig(input.config?.sftp);
        if (!sftpConfig) {
            throw new Error('SFTP not configured. Provide deployment.config.sftp ({ host, user, password|keyPath, remotePath }) ' +
                'or set SFTP_HOST / SFTP_USER / SFTP_PASS / SFTP_REMOTE_PATH in the environment.');
        }
        const exportResult = await this.staticExport.deploy(input);
        const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
        if (!localDir)
            throw new Error('Static export produced no local artefact to upload.');
        const client = new ssh2_sftp_client_1.default();
        const logLines = [exportResult.log ?? ''];
        try {
            await client.connect({
                host: sftpConfig.host,
                port: sftpConfig.port ?? 22,
                username: sftpConfig.user,
                password: sftpConfig.password,
                privateKey: sftpConfig.keyPath ? await node_fs_1.promises.readFile(sftpConfig.keyPath) : undefined,
                readyTimeout: 20_000,
            });
            logLines.push(`✓ Connected to ${sftpConfig.host}:${sftpConfig.port ?? 22} as ${sftpConfig.user}`);
            const remotePath = sftpConfig.remotePath.replace(/\/+$/, '');
            const tenantSubdir = `${remotePath}/${input.tenantId}`;
            await client.mkdir(tenantSubdir, true).catch(() => undefined);
            const stats = await this.uploadDir(client, localDir, tenantSubdir);
            logLines.push(`✓ Uploaded ${stats.files} files (${(stats.bytes / 1024).toFixed(1)} KB) → ${tenantSubdir}`);
            return {
                artefactUrl: `sftp://${sftpConfig.user}@${sftpConfig.host}${tenantSubdir}`,
                log: logLines.filter(Boolean).join('\n'),
                version: String(Date.now()),
            };
        }
        finally {
            await client.end().catch(() => undefined);
        }
    }
    async uploadDir(client, localDir, remoteDir) {
        const entries = await node_fs_1.promises.readdir(localDir, { withFileTypes: true });
        let files = 0;
        let bytes = 0;
        for (const entry of entries) {
            const localPath = path.join(localDir, entry.name);
            const remotePath = `${remoteDir}/${entry.name}`;
            if (entry.isDirectory()) {
                await client.mkdir(remotePath, true).catch(() => undefined);
                const sub = await this.uploadDir(client, localPath, remotePath);
                files += sub.files;
                bytes += sub.bytes;
            }
            else if (entry.isFile()) {
                const stat = await node_fs_1.promises.stat(localPath);
                await client.put(localPath, remotePath);
                files += 1;
                bytes += stat.size;
            }
        }
        return { files, bytes };
    }
    resolveConfig(supplied) {
        const cfg = {
            host: supplied?.host ?? this.config.get('deployments.sftp.host') ?? '',
            port: supplied?.port ?? this.config.get('deployments.sftp.port') ?? 22,
            user: supplied?.user ?? this.config.get('deployments.sftp.user') ?? '',
            password: supplied?.password ?? this.config.get('deployments.sftp.pass') ?? undefined,
            keyPath: supplied?.keyPath ?? this.config.get('deployments.sftp.keyPath') ?? undefined,
            remotePath: supplied?.remotePath ?? this.config.get('deployments.sftp.remotePath') ?? '',
        };
        if (!cfg.host || !cfg.user || !cfg.remotePath)
            return null;
        if (!cfg.password && !cfg.keyPath)
            return null;
        return cfg;
    }
};
exports.SftpAdapter = SftpAdapter;
exports.SftpAdapter = SftpAdapter = SftpAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        static_export_adapter_1.StaticExportAdapter])
], SftpAdapter);
//# sourceMappingURL=sftp.adapter.js.map