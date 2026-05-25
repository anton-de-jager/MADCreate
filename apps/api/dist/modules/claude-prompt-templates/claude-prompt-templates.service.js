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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudePromptTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ClaudePromptTemplatesService = class ClaudePromptTemplatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.claudePromptTemplate.findMany({ orderBy: { name: 'asc' } });
    }
    async findOne(id) {
        const t = await this.prisma.claudePromptTemplate.findUnique({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException(`Template #${id} not found`);
        return t;
    }
    create(dto) {
        return this.prisma.claudePromptTemplate.create({
            data: { name: dto.name, description: dto.description ?? null, content: dto.content },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.content !== undefined)
            data.content = dto.content;
        return this.prisma.claudePromptTemplate.update({ where: { id }, data });
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.claudePromptTemplate.delete({ where: { id } });
    }
};
exports.ClaudePromptTemplatesService = ClaudePromptTemplatesService;
exports.ClaudePromptTemplatesService = ClaudePromptTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClaudePromptTemplatesService);
//# sourceMappingURL=claude-prompt-templates.service.js.map