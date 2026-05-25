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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeTasksController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const claude_tasks_service_1 = require("./claude-tasks.service");
const storage_service_1 = require("../storage/storage.service");
const claude_task_dto_1 = require("./dto/claude-task.dto");
const ALLOWED_MIME = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/csv', 'application/json',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
let ClaudeTasksController = class ClaudeTasksController {
    service;
    storage;
    constructor(service, storage) {
        this.service = service;
        this.storage = storage;
    }
    findAll() { return this.service.findAll(); }
    async findNext(res) {
        const result = await this.service.findNext();
        if (result.task === null) {
            res.status(common_1.HttpStatus.NO_CONTENT);
            return undefined;
        }
        return result;
    }
    importBulk(dto) { return this.service.importBulk(dto); }
    events() {
        return new rxjs_1.Observable((subscriber) => {
            const send = () => subscriber.next({ data: { ts: Date.now() } });
            const unsub = this.service.onTaskChange(send);
            const hb = setInterval(() => subscriber.next({ data: { heartbeat: true } }), 30_000);
            return () => { unsub(); clearInterval(hb); };
        });
    }
    getSettings() { return this.service.getSettings(); }
    updateSettings(dto) { return this.service.updateSettings(dto); }
    findOne(i) { return this.service.findOne(i); }
    create(dto) { return this.service.create(dto); }
    update(i, dto) {
        return this.service.update(i, dto);
    }
    remove(i) { return this.service.remove(i); }
    async addAttachments(id, files) {
        if (!files?.length)
            throw new common_1.BadRequestException('No files provided');
        const task = await this.service.findOne(id);
        const existing = task.attachments ?? [];
        const added = [];
        for (const file of files) {
            if (!ALLOWED_MIME.has(file.mimetype)) {
                throw new common_1.BadRequestException(`File type not allowed: ${file.mimetype}`);
            }
            const stored = await this.storage.put(`claude-tasks-${id}`, {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                buffer: file.buffer,
            });
            added.push({
                filename: stored.key,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                url: stored.url,
            });
        }
        return this.service.update(id, { attachments: [...existing, ...added] });
    }
    async removeAttachment(id, filename) {
        const task = await this.service.findOne(id);
        const all = task.attachments ?? [];
        const target = all.find((a) => a.filename === filename || a.filename.endsWith('/' + filename));
        const kept = all.filter((a) => a !== target);
        if (target) {
            try {
                await this.storage.delete(target.filename);
            }
            catch { }
        }
        await this.service.update(id, { attachments: kept });
    }
};
exports.ClaudeTasksController = ClaudeTasksController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ClaudeTasksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('next'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClaudeTasksController.prototype, "findNext", null);
__decorate([
    (0, common_1.Post)('import-bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [claude_task_dto_1.ImportBulkClaudeTasksDto]),
    __metadata("design:returntype", void 0)
], ClaudeTasksController.prototype, "importBulk", null);
__decorate([
    (0, common_1.Sse)('events'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rxjs_1.Observable)
], ClaudeTasksController.prototype, "events", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ClaudeTasksController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [claude_task_dto_1.UpdateClaudeSettingsDto]),
    __metadata("design:returntype", void 0)
], ClaudeTasksController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ClaudeTasksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [claude_task_dto_1.CreateClaudeTaskDto]),
    __metadata("design:returntype", void 0)
], ClaudeTasksController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, claude_task_dto_1.UpdateClaudeTaskDto]),
    __metadata("design:returntype", void 0)
], ClaudeTasksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ClaudeTasksController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/attachments'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10, { limits: { fileSize: MAX_FILE_SIZE } })),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Array]),
    __metadata("design:returntype", Promise)
], ClaudeTasksController.prototype, "addAttachments", null);
__decorate([
    (0, common_1.Delete)(':id/attachments/:filename'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('filename')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], ClaudeTasksController.prototype, "removeAttachment", null);
exports.ClaudeTasksController = ClaudeTasksController = __decorate([
    (0, swagger_1.ApiTags)('claude-tasks'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('claude-tasks'),
    __metadata("design:paramtypes", [claude_tasks_service_1.ClaudeTasksService,
        storage_service_1.StorageService])
], ClaudeTasksController);
//# sourceMappingURL=claude-tasks.controller.js.map