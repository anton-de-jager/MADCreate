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
var SiteApplicatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteApplicatorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let SiteApplicatorService = SiteApplicatorService_1 = class SiteApplicatorService {
    prisma;
    logger = new common_1.Logger(SiteApplicatorService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    parse(input) {
        let obj;
        if (typeof input === 'string') {
            const cleaned = stripJsonFence(input.trim());
            try {
                obj = JSON.parse(cleaned);
            }
            catch (err) {
                throw new common_1.BadRequestException(`Pasted text isn't valid JSON: ${err.message}. Make sure to copy only the JSON object from Claude Code, including the outer braces.`);
            }
        }
        else {
            obj = input;
        }
        return validate(obj);
    }
    async apply(tenantId, spec) {
        try {
            return await this.applyOnce(tenantId, spec);
        }
        catch (err) {
            const code = err instanceof Error && 'code' in err
                ? err.code
                : err != null && typeof err === 'object' && 'errorCode' in err
                    ? err.errorCode
                    : undefined;
            const msg = err instanceof Error ? err.message : String(err);
            if (code === 'P1017' || /closed the connection/i.test(msg)) {
                this.logger.warn('Applicator hit P1017; reconnecting + retrying once.');
                await this.prisma.$disconnect();
                await this.prisma.$connect();
                return await this.applyOnce(tenantId, spec);
            }
            throw err;
        }
    }
    async applyOnce(tenantId, spec) {
        return this.prisma.$transaction(async (tx) => {
            await tx.tenant.update({
                where: { id: tenantId },
                data: {
                    branding: {
                        colors: spec.brandKit.colors,
                        typography: spec.brandKit.typography,
                        voice: spec.brandKit.voice,
                        tagline: spec.brandKit.tagline,
                        mission: spec.brandKit.mission,
                        logoConcept: spec.brandKit.logoConcept,
                    },
                },
            });
            await tx.theme.updateMany({ where: { tenantId, isActive: true }, data: { isActive: false } });
            const theme = await tx.theme.create({
                data: {
                    tenantId,
                    name: spec.brandKit.name ?? 'AI Generated',
                    isActive: true,
                    tokens: {
                        colors: spec.brandKit.colors,
                        typography: spec.brandKit.typography,
                        voice: spec.brandKit.voice,
                        radius: { sm: '6px', md: '8px', lg: '12px', xl: '20px' },
                        spacing: { tight: '0.5rem', base: '1rem', loose: '2rem' },
                    },
                },
            });
            await tx.site.updateMany({
                where: { tenantId, deletedAt: null },
                data: { deletedAt: new Date(), status: client_1.SiteStatus.DRAFT },
            });
            const site = await tx.site.create({
                data: {
                    tenantId,
                    name: spec.site.name,
                    themeId: theme.id,
                    status: client_1.SiteStatus.PUBLISHED,
                    version: 1,
                    publishedAt: new Date(),
                    navigation: spec.site.navigation,
                    settings: spec.site.settings,
                },
            });
            const createdPages = await Promise.all(spec.site.pages.map((p, i) => tx.page.create({
                data: {
                    tenantId,
                    siteId: site.id,
                    slug: p.slug,
                    title: p.title,
                    metaTitle: p.metaTitle ?? p.title,
                    metaDescription: p.metaDescription,
                    status: client_1.PageStatus.PUBLISHED,
                    order: i,
                    publishedAt: new Date(),
                    schema: {
                        sections: p.sections,
                        meta: { title: p.metaTitle ?? p.title, description: p.metaDescription },
                    },
                },
            })));
            const sectionRows = createdPages.flatMap((page, pi) => spec.site.pages[pi].sections.map((s, j) => ({
                tenantId,
                pageId: page.id,
                kind: s.kind,
                order: j,
                props: s.props,
            })));
            if (sectionRows.length) {
                await tx.section.createMany({ data: sectionRows });
            }
            return { siteId: site.id, themeId: theme.id, pageCount: createdPages.length };
        }, { timeout: 30_000, maxWait: 5_000 });
    }
};
exports.SiteApplicatorService = SiteApplicatorService;
exports.SiteApplicatorService = SiteApplicatorService = SiteApplicatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SiteApplicatorService);
function stripJsonFence(text) {
    const fence = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (fence)
        return fence[1].trim();
    return text;
}
function validate(obj) {
    if (!obj || typeof obj !== 'object')
        throw new common_1.BadRequestException('Site spec must be a JSON object.');
    const o = obj;
    if (!o.brandKit || typeof o.brandKit !== 'object')
        throw new common_1.BadRequestException('Missing "brandKit" object.');
    if (!o.site || typeof o.site !== 'object')
        throw new common_1.BadRequestException('Missing "site" object.');
    const bk = o.brandKit;
    for (const k of ['name', 'tagline', 'mission', 'voice', 'logoConcept']) {
        if (typeof bk[k] !== 'string')
            throw new common_1.BadRequestException(`brandKit.${k} must be a string.`);
    }
    if (!bk.colors || typeof bk.colors !== 'object')
        throw new common_1.BadRequestException('brandKit.colors must be an object.');
    if (!bk.typography || typeof bk.typography !== 'object')
        throw new common_1.BadRequestException('brandKit.typography must be an object.');
    const s = o.site;
    if (typeof s.name !== 'string')
        throw new common_1.BadRequestException('site.name must be a string.');
    const nav = s.navigation;
    if (!nav?.items || !Array.isArray(nav.items))
        throw new common_1.BadRequestException('site.navigation.items must be an array.');
    if (!s.settings || typeof s.settings !== 'object')
        throw new common_1.BadRequestException('site.settings must be an object.');
    if (!Array.isArray(s.pages) || s.pages.length === 0)
        throw new common_1.BadRequestException('site.pages must be a non-empty array.');
    for (const p of s.pages) {
        if (typeof p.slug !== 'string')
            throw new common_1.BadRequestException('Each page needs a string slug.');
        if (typeof p.title !== 'string')
            throw new common_1.BadRequestException(`Page "${p.slug}" needs a title.`);
        if (!Array.isArray(p.sections))
            throw new common_1.BadRequestException(`Page "${p.slug}" needs a sections array.`);
        for (const sec of p.sections) {
            if (typeof sec.kind !== 'string')
                throw new common_1.BadRequestException(`A section on "${p.slug}" is missing kind.`);
            if (!sec.props || typeof sec.props !== 'object')
                throw new common_1.BadRequestException(`A section on "${p.slug}" is missing props.`);
        }
    }
    return o;
}
//# sourceMappingURL=site-applicator.service.js.map