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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
const path = __importStar(require("node:path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let StorageService = StorageService_1 = class StorageService {
    config;
    logger = new common_1.Logger(StorageService_1.name);
    driver;
    name;
    constructor(config) {
        this.config = config;
        const requested = (this.config.get('storage.driver') ?? 'local').toLowerCase();
        const forced = this.config.get('storage.localForced') === true;
        const isProd = this.config.get('nodeEnv') === 'production';
        if (requested === 's3') {
            this.driver = new S3StorageDriver(this.config);
            this.name = 's3';
        }
        else {
            if (isProd && !forced) {
                this.logger.warn('[storage] STORAGE_DRIVER=local in production — uploads are not shared between replicas. Set STORAGE_DRIVER=s3 or STORAGE_LOCAL_FORCED=1 to silence this.');
            }
            this.driver = new LocalStorageDriver(this.config);
            this.name = 'local';
        }
    }
    put(prefix, file) {
        return this.driver.put(prefix, file);
    }
    delete(key) { return this.driver.delete(key); }
    async signedUrl(key, ttlSeconds = 600) {
        if (this.driver.signedUrl)
            return this.driver.signedUrl(key, ttlSeconds);
        const baseUrl = (this.config.get('storage.publicUrl') ?? '/media').replace(/\/+$/, '');
        return `${baseUrl}/${key}`;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
class LocalStorageDriver {
    name = 'local';
    logger = new common_1.Logger(LocalStorageDriver.name);
    localPath;
    publicUrl;
    constructor(config) {
        this.localPath = config.get('storage.localPath') ?? './storage/uploads';
        this.publicUrl = (config.get('storage.publicUrl') ?? '/media').replace(/\/+$/, '');
    }
    async put(prefix, file) {
        const hash = (0, node_crypto_1.createHash)('sha1').update(file.buffer).digest('hex').slice(0, 16);
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${hash}${ext}`;
        const key = `${prefix}/${filename}`;
        const absDir = path.resolve(this.localPath, prefix);
        await node_fs_1.promises.mkdir(absDir, { recursive: true });
        await node_fs_1.promises.writeFile(path.join(absDir, filename), file.buffer);
        return { key, url: `${this.publicUrl}/${key}` };
    }
    async delete(key) {
        const normalized = path.normalize(key).replace(/^[\\/]+/, '');
        if (normalized.split(/[\\/]/).includes('..')) {
            this.logger.warn(`Refusing to delete suspicious key: ${key}`);
            return false;
        }
        const abs = path.resolve(this.localPath, normalized);
        const rootAbs = path.resolve(this.localPath);
        if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) {
            this.logger.warn(`Refusing to delete out-of-tree key: ${key}`);
            return false;
        }
        try {
            await node_fs_1.promises.unlink(abs);
            return true;
        }
        catch (err) {
            if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT')
                return false;
            throw err;
        }
    }
}
class S3StorageDriver {
    name = 's3';
    logger = new common_1.Logger(S3StorageDriver.name);
    client;
    bucket;
    publicUrl;
    forceSign;
    constructor(config) {
        const region = config.get('storage.s3.region') ?? 'auto';
        const endpoint = config.get('storage.s3.endpoint');
        const accessKeyId = config.get('storage.s3.accessKey') ?? '';
        const secretAccessKey = config.get('storage.s3.secretKey') ?? '';
        this.bucket = config.get('storage.s3.bucket') ?? '';
        if (!this.bucket) {
            this.logger.error('[s3] storage.s3.bucket is empty — uploads will fail. Set S3_BUCKET via .env.deploy.');
        }
        this.publicUrl = (config.get('storage.s3.publicUrl') ?? '').replace(/\/+$/, '') || null;
        this.forceSign = config.get('storage.s3.forceSignedUrls') === true;
        this.client = new client_s3_1.S3Client({
            region,
            endpoint: endpoint || undefined,
            forcePathStyle: !!endpoint,
            credentials: { accessKeyId, secretAccessKey },
        });
        this.logger.log(`[s3] bucket=${this.bucket} region=${region}${endpoint ? ' endpoint=' + endpoint : ''}`);
    }
    async put(prefix, file) {
        const hash = (0, node_crypto_1.createHash)('sha1').update(file.buffer).digest('hex').slice(0, 16);
        const ext = path.extname(file.originalname).toLowerCase();
        const key = `${prefix}/${hash}${ext}`;
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ContentDisposition: `inline; filename="${file.originalname.replace(/"/g, '')}"`,
        }));
        const url = this.forceSign
            ? await this.signedUrl(key)
            : this.publicUrl
                ? `${this.publicUrl}/${key}`
                : await this.signedUrl(key);
        return { key, url };
    }
    async delete(key) {
        try {
            await this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
            return true;
        }
        catch (err) {
            const e = err && typeof err === 'object' ? err : undefined;
            const meta = e?.$metadata;
            const httpStatus = meta && typeof meta === 'object' ? meta.httpStatusCode : undefined;
            if (httpStatus === 404 || e?.name === 'NoSuchKey')
                return false;
            throw err;
        }
    }
    async signedUrl(key, ttlSeconds = 600) {
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: ttlSeconds });
    }
}
//# sourceMappingURL=storage.service.js.map