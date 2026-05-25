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
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
function ttlToMs(ttl) {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m)
        return 15 * 60 * 1000;
    const n = Number(m[1]);
    const u = m[2];
    return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[u];
}
let TokenService = class TokenService {
    jwt;
    config;
    prisma;
    constructor(jwt, config, prisma) {
        this.jwt = jwt;
        this.config = config;
        this.prisma = prisma;
    }
    async issueTokens(userId, email, opts = {}) {
        const payload = {
            sub: userId,
            email,
            superAdmin: opts.superAdmin,
            wsid: opts.workspaceId,
            role: opts.role,
        };
        const accessToken = await this.jwt.signAsync(payload);
        const rawRefresh = (0, node_crypto_1.randomBytes)(48).toString('hex');
        const refreshHash = this.hash(rawRefresh);
        const refreshTtl = this.config.get('jwt.refreshTtl') ?? '30d';
        await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenHash: refreshHash,
                userAgent: opts.userAgent?.slice(0, 1024),
                ip: opts.ip,
                expiresAt: new Date(Date.now() + ttlToMs(refreshTtl)),
            },
        });
        return {
            accessToken,
            refreshToken: rawRefresh,
            expiresIn: Math.floor(ttlToMs(this.config.get('jwt.accessTtl') ?? '15m') / 1000),
            tokenType: 'Bearer',
        };
    }
    async rotateRefresh(rawRefresh, userAgent, ip) {
        const hash = this.hash(rawRefresh);
        const current = await this.prisma.refreshToken.findUnique({
            where: { tokenHash: hash },
            include: { user: true },
        });
        if (!current || current.revokedAt || current.expiresAt < new Date()) {
            throw new Error('Refresh token invalid or expired');
        }
        await this.prisma.refreshToken.update({
            where: { id: current.id },
            data: { revokedAt: new Date() },
        });
        return this.issueTokens(current.user.id, current.user.email, {
            superAdmin: current.user.isSuperAdmin,
            userAgent,
            ip,
        });
    }
    async revokeAllForUser(userId) {
        await this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    hash(raw) {
        return (0, node_crypto_1.createHash)('sha256').update(raw).digest('hex');
    }
    generateToken(bytes = 32) {
        const raw = (0, node_crypto_1.randomBytes)(bytes).toString('hex');
        return { raw, hash: this.hash(raw) };
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        prisma_service_1.PrismaService])
], TokenService);
//# sourceMappingURL=token.service.js.map