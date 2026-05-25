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
var MediaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenants_service_1 = require("../tenants/tenants.service");
const storage_service_1 = require("../storage/storage.service");
const client_1 = require("@prisma/client");
let MediaService = MediaService_1 = class MediaService {
    prisma;
    tenants;
    storage;
    logger = new common_1.Logger(MediaService_1.name);
    constructor(prisma, tenants, storage) {
        this.prisma = prisma;
        this.tenants = tenants;
        this.storage = storage;
    }
    async list(userId, tenantId) {
        await this.tenants.get(userId, tenantId);
        return this.prisma.media.findMany({ where: { tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
    }
    async uploadLocal(userId, tenantId, file) {
        await this.tenants.get(userId, tenantId);
        const stored = await this.storage.put(tenantId, file);
        return this.prisma.media.create({
            data: {
                tenantId,
                uploaderId: userId,
                kind: this.guessKind(file.mimetype),
                filename: file.originalname,
                contentType: file.mimetype,
                sizeBytes: file.size,
                url: stored.url,
                storageKey: stored.key,
            },
        });
    }
    async remove(userId, tenantId, id) {
        await this.tenants.get(userId, tenantId);
        const m = await this.prisma.media.findUnique({ where: { id } });
        if (!m || m.tenantId !== tenantId)
            throw new common_1.NotFoundException();
        const result = await this.prisma.media.update({ where: { id }, data: { deletedAt: new Date() } });
        const storageKey = m.storageKey ?? `${m.tenantId}/${m.url.split('/').pop()}`;
        void this.storage.delete(storageKey).catch((err) => this.logger.warn(`Failed to delete storage file [${storageKey}]`, err));
        return result;
    }
    guessKind(mime) {
        if (mime.startsWith('image/'))
            return client_1.MediaKind.IMAGE;
        if (mime.startsWith('video/'))
            return client_1.MediaKind.VIDEO;
        if (mime.startsWith('audio/'))
            return client_1.MediaKind.AUDIO;
        if (mime.includes('font') || mime.includes('woff') || mime.includes('ttf'))
            return client_1.MediaKind.FONT;
        if (mime.includes('svg'))
            return client_1.MediaKind.ICON;
        return client_1.MediaKind.DOCUMENT;
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = MediaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tenants_service_1.TenantsService,
        storage_service_1.StorageService])
], MediaService);
//# sourceMappingURL=media.service.js.map