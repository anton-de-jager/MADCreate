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
var AuditInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AuditInterceptor = AuditInterceptor_1 = class AuditInterceptor {
    prisma;
    logger = new common_1.Logger(AuditInterceptor_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    intercept(ctx, next) {
        const req = ctx.switchToHttp().getRequest();
        const method = req.method?.toUpperCase();
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS')
            return next.handle();
        const url = req.originalUrl || req.url || '';
        if (isAuditSkip(url))
            return next.handle();
        const action = inferAction(method, url);
        const entity = inferEntity(url);
        return next.handle().pipe((0, rxjs_1.tap)({
            next: () => {
                this.write({ req, action, entity }).catch((e) => this.logger.warn(`Audit write failed: ${e.message}`));
            },
        }));
    }
    async write(args) {
        const { req, action, entity } = args;
        const userId = req.user?.sub ?? null;
        const query = req.query;
        const body = req.body;
        const tenantId = (typeof query.tenantId === 'string' ? query.tenantId : null) ??
            (typeof body.tenantId === 'string' ? body.tenantId : null);
        const workspaceId = (typeof query.workspaceId === 'string' ? query.workspaceId : null) ??
            (typeof body.workspaceId === 'string' ? body.workspaceId : null);
        await this.prisma.auditLog.create({
            data: {
                action,
                entity,
                userId,
                tenantId,
                workspaceId,
                ip: req.ip ?? null,
                userAgent: req.headers['user-agent']?.toString().slice(0, 1000) ?? null,
                meta: {
                    method: req.method,
                    path: req.originalUrl || req.url,
                    worker: !!req.worker,
                },
            },
        });
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = AuditInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditInterceptor);
function isAuditSkip(url) {
    if (url.includes('/health'))
        return true;
    if (url.includes('/auth/refresh'))
        return true;
    if (url.includes('/claude-tasks/next'))
        return true;
    return false;
}
function inferAction(method, url) {
    if (/\/auth\/login/.test(url))
        return client_1.AuditAction.LOGIN;
    if (/\/auth\/logout/.test(url))
        return client_1.AuditAction.LOGOUT;
    if (/\/deploy/.test(url))
        return client_1.AuditAction.DEPLOY;
    if (/\/invites?/.test(url))
        return client_1.AuditAction.INVITE;
    if (/\/generate|\/ai\//.test(url))
        return client_1.AuditAction.GENERATE;
    if (/publish/.test(url))
        return client_1.AuditAction.PUBLISH;
    if (method === 'POST')
        return client_1.AuditAction.CREATE;
    if (method === 'PATCH' || method === 'PUT')
        return client_1.AuditAction.UPDATE;
    if (method === 'DELETE')
        return client_1.AuditAction.DELETE;
    return client_1.AuditAction.UPDATE;
}
function inferEntity(url) {
    const path = url.split('?')[0].replace(/^\/+/, '');
    const segs = path.split('/').filter(Boolean);
    if (segs[0] === 'v1')
        segs.shift();
    return segs[0] ?? 'unknown';
}
//# sourceMappingURL=audit.interceptor.js.map