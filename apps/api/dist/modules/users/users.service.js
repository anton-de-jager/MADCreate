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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async me(userId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            include: {
                memberships: {
                    where: { status: 'ACTIVE' },
                    include: { workspace: { select: { id: true, slug: true, name: true, logoUrl: true } } },
                },
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const { passwordHash: _ph, ...rest } = user;
        return rest;
    }
    async updateProfile(userId, patch) {
        return this.prisma.user.update({
            where: { id: userId },
            data: patch,
            select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true, locale: true, timezone: true, phone: true },
        });
    }
    async deleteAccount(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const now = new Date();
        const tombstoneEmail = `${user.email}.deleted.${now.getTime()}`;
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: { deletedAt: now, email: tombstoneEmail },
            }),
            this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
            this.prisma.workspaceMember.updateMany({ where: { userId }, data: { status: 'SUSPENDED' } }),
        ]);
        return { deletedAt: now };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map