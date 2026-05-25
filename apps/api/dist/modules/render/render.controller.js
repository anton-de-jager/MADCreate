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
exports.RenderController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const render_service_1 = require("./render.service");
function xmlEscape(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
let RenderController = class RenderController {
    render;
    config;
    constructor(render, config) {
        this.render = render;
        this.config = config;
    }
    async site(req, slug) {
        if (slug) {
            const site = await this.render.getSiteForSlug(slug);
            if (!site)
                throw new common_1.NotFoundException('Site not found');
            return site;
        }
        const host = (req.header('x-forwarded-host') ?? req.header('host') ?? '').split(':')[0];
        if (!host)
            throw new common_1.NotFoundException('No host');
        const site = await this.render.getSiteForHostname(host);
        if (!site)
            throw new common_1.NotFoundException('Site not found');
        return site;
    }
    async page(slug, pageSlug) {
        return this.render.getPageBySlug(slug, pageSlug);
    }
    async robots(slug) {
        return `User-agent: *\nAllow: /\nSitemap: https://${this.config.get('web.publicDomain') ?? 'madcreate.madleads.ai'}/${slug}/sitemap.xml\n`;
    }
    async sitemap(slug) {
        const site = await this.render.getSiteForSlug(slug);
        if (!site)
            throw new common_1.NotFoundException();
        const domain = this.config.get('web.publicDomain') ?? 'madcreate.madleads.ai';
        const base = `https://${domain}/${xmlEscape(slug)}`;
        const urls = site.pages
            .map((p) => `  <url><loc>${base}${p.slug === 'home' ? '' : '/' + xmlEscape(p.slug)}</loc></url>`)
            .join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    }
};
exports.RenderController = RenderController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('site'),
    (0, common_1.Header)('Cache-Control', 'public, max-age=30, stale-while-revalidate=60'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RenderController.prototype, "site", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('site/:slug/page/:pageSlug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Param)('pageSlug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RenderController.prototype, "page", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':slug/robots.txt'),
    (0, common_1.Header)('Content-Type', 'text/plain'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RenderController.prototype, "robots", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':slug/sitemap.xml'),
    (0, common_1.Header)('Content-Type', 'application/xml'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RenderController.prototype, "sitemap", null);
exports.RenderController = RenderController = __decorate([
    (0, swagger_1.ApiTags)('render'),
    (0, common_1.Controller)('render'),
    __metadata("design:paramtypes", [render_service_1.RenderService,
        config_1.ConfigService])
], RenderController);
//# sourceMappingURL=render.controller.js.map