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
exports.IntegrationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const integrations_service_1 = require("./integrations.service");
const install_integration_dto_1 = require("./dto/install-integration.dto");
let IntegrationsController = class IntegrationsController {
    integrations;
    constructor(integrations) {
        this.integrations = integrations;
    }
    catalog() {
        return this.integrations.catalog();
    }
    suggest(industry) {
        return { industry: industry ?? null, keys: suggestForIndustry(industry) };
    }
    installed(user, tenantId) {
        return this.integrations.installed(user.sub, tenantId);
    }
    install(user, tenantId, dto) {
        return this.integrations.install(user.sub, tenantId, dto);
    }
    uninstall(user, tenantId, id) {
        return this.integrations.uninstall(user.sub, tenantId, id);
    }
};
exports.IntegrationsController = IntegrationsController;
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('catalog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "catalog", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('suggest'),
    __param(0, (0, common_1.Query)('industry')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "suggest", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)('installed'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "installed", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)('install'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, install_integration_dto_1.InstallIntegrationDto]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "install", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "uninstall", null);
exports.IntegrationsController = IntegrationsController = __decorate([
    (0, swagger_1.ApiTags)('integrations'),
    (0, common_1.Controller)('integrations'),
    __metadata("design:paramtypes", [integrations_service_1.IntegrationsService])
], IntegrationsController);
const INDUSTRY_RULES = [
    { match: /restaur|cafe|food|hospital(?!ity)/i, keys: ['stripe', 'payfast', 'calendly', 'whatsapp', 'google_maps', 'mailchimp', 'shopify', 'twilio'] },
    { match: /retail|shop|store|ecomm|e-?commerce/i, keys: ['stripe', 'paypal', 'shopify', 'woocommerce', 'klaviyo', 'mailchimp', 'shippo', 'google_analytics', 'meta_ads'] },
    { match: /saas|software|tech|developer/i, keys: ['stripe', 'paddle', 'sendgrid', 'posthog', 'mixpanel', 'intercom', 'auth0', 'openai', 'anthropic', 'cloudflare', 'vercel'] },
    { match: /church|ministry|community|nonprofit|charity/i, keys: ['payfast', 'paypal', 'mailchimp', 'whatsapp', 'youtube', 'zoom', 'google_calendar', 'google_maps'] },
    { match: /law|legal|attorney|advocate/i, keys: ['docusign', 'calendly', 'stripe', 'xero', 'google_workspace', 'hubspot', 'auth0'] },
    { match: /medical|clinic|doctor|health|dental/i, keys: ['calendly', 'stripe', 'whatsapp', 'twilio', 'google_maps', 'onetrust', 'auth0'] },
    { match: /agency|consult|freelanc/i, keys: ['stripe', 'calendly', 'hubspot', 'mailchimp', 'docusign', 'xero', 'zapier', 'google_workspace'] },
    { match: /education|school|tutor|cours/i, keys: ['stripe', 'calendly', 'zoom', 'sendgrid', 'mailchimp', 'youtube', 'whatsapp'] },
    { match: /real ?estate|propert/i, keys: ['google_maps', 'mapbox', 'whatsapp', 'docusign', 'mailchimp', 'hubspot', 'calendly'] },
    { match: /fitness|gym|wellness/i, keys: ['stripe', 'calendly', 'twilio', 'mailchimp', 'whatsapp', 'klaviyo'] },
    { match: /event|wedding|venue/i, keys: ['stripe', 'calendly', 'mailchimp', 'twilio', 'whatsapp', 'google_maps', 'youtube'] },
    { match: /recruit|hiring|\bhr\b|talent/i, keys: ['greenhouse', 'lever', 'bamboohr', 'workable', 'linkedin_ads', 'mailchimp', 'calendly'] },
    { match: /logistics|shipping|transport|courier/i, keys: ['shippo', 'easypost', 'dhl', 'fedex', 'ups', 'bobgo', 'google_maps', 'whatsapp'] },
];
function suggestForIndustry(industry) {
    if (!industry) {
        return ['stripe', 'mailchimp', 'sendgrid', 'whatsapp', 'google_analytics', 'calendly', 'google_maps'];
    }
    for (const r of INDUSTRY_RULES) {
        if (r.match.test(industry))
            return r.keys;
    }
    return ['stripe', 'mailchimp', 'sendgrid', 'whatsapp', 'google_analytics', 'hubspot'];
}
//# sourceMappingURL=integrations.controller.js.map