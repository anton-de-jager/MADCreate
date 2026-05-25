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
var DockerAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const static_export_adapter_1 = require("./static-export.adapter");
let DockerAdapter = DockerAdapter_1 = class DockerAdapter {
    config;
    staticExport;
    logger = new common_1.Logger(DockerAdapter_1.name);
    constructor(config, staticExport) {
        this.config = config;
        this.staticExport = staticExport;
    }
    async deploy(input) {
        const cfg = this.resolveConfig(input.config?.docker);
        if (!cfg) {
            throw new Error('Docker target requires deployment.config.docker.image (and DOCKER_REGISTRY_USER/PASS if pushing to a private registry).');
        }
        const exportResult = await this.staticExport.deploy(input);
        const localDir = exportResult.artefactUrl?.replace(/^file:\/\//, '');
        if (!localDir)
            throw new Error('Static export produced no local artefact.');
        const baseImage = cfg.baseImage ?? 'nginx:1.27-alpine';
        const tag = cfg.tag ?? `${input.tenantId}-${Date.now()}`;
        const fullRef = `${cfg.image}:${tag}`;
        await node_fs_1.promises.writeFile(path.join(localDir, 'Dockerfile'), `FROM ${baseImage}\nCOPY . /usr/share/nginx/html\nEXPOSE 80\n`, 'utf8');
        const log = [exportResult.log ?? ''];
        if (cfg.registryUser && cfg.registryPass) {
            log.push(await runDocker(['login', '--username', cfg.registryUser, '--password-stdin', registryOf(cfg.image)], cfg.registryPass));
        }
        log.push(await runDocker(['build', '-t', fullRef, localDir]));
        log.push(await runDocker(['push', fullRef]));
        return { artefactUrl: `docker://${fullRef}`, version: tag, log: log.filter(Boolean).join('\n') };
    }
    resolveConfig(s) {
        if (!s?.image && !this.config.get('deployments.docker.image'))
            return null;
        return {
            image: s?.image ?? this.config.get('deployments.docker.image') ?? '',
            tag: s?.tag,
            registryUser: s?.registryUser ?? this.config.get('deployments.docker.registryUser'),
            registryPass: s?.registryPass ?? this.config.get('deployments.docker.registryPass'),
            baseImage: s?.baseImage ?? this.config.get('deployments.docker.baseImage'),
        };
    }
};
exports.DockerAdapter = DockerAdapter;
exports.DockerAdapter = DockerAdapter = DockerAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        static_export_adapter_1.StaticExportAdapter])
], DockerAdapter);
function registryOf(image) {
    const firstSlash = image.indexOf('/');
    if (firstSlash === -1)
        return 'docker.io';
    const maybeRegistry = image.slice(0, firstSlash);
    return maybeRegistry.includes('.') || maybeRegistry.includes(':') ? maybeRegistry : 'docker.io';
}
function runDocker(args, stdin) {
    return new Promise((resolve, reject) => {
        const proc = (0, node_child_process_1.spawn)('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let out = '', err = '';
        proc.stdout.on('data', (d) => { out += d.toString(); });
        proc.stderr.on('data', (d) => { err += d.toString(); });
        proc.on('error', (e) => reject(new Error(`docker ${args[0]} failed to spawn: ${e.message}`)));
        proc.on('close', (code) => {
            if (code === 0)
                resolve(`$ docker ${args.join(' ')}\n${out}`);
            else
                reject(new Error(`docker ${args[0]} exited ${code}\n${err || out}`));
        });
        if (stdin) {
            proc.stdin.write(stdin);
            proc.stdin.end();
        }
    });
}
//# sourceMappingURL=docker.adapter.js.map