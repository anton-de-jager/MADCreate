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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const rxjs_1 = require("rxjs");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const ai_service_1 = require("./ai.service");
const submit_generation_dto_1 = require("./dto/submit-generation.dto");
class GenerateDto {
    kind;
    promptKey;
    model;
    variables;
    systemPrompt;
    userPrompt;
    temperature;
    maxTokens;
    jsonMode;
    provider;
}
__decorate([
    (0, class_validator_1.IsEnum)(['SITE', 'PAGE', 'SECTION', 'COPY', 'THEME', 'PALETTE', 'TYPOGRAPHY', 'IMAGE_PROMPT', 'SEO', 'SCHEMA', 'WORKFLOW']),
    __metadata("design:type", Object)
], GenerateDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateDto.prototype, "promptKey", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], GenerateDto.prototype, "variables", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateDto.prototype, "systemPrompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateDto.prototype, "userPrompt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateDto.prototype, "temperature", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], GenerateDto.prototype, "maxTokens", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], GenerateDto.prototype, "jsonMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], GenerateDto.prototype, "provider", void 0);
let AiController = class AiController {
    ai;
    constructor(ai) {
        this.ai = ai;
    }
    events() {
        return new rxjs_1.Observable((subscriber) => {
            const send = () => subscriber.next({ data: { ts: Date.now() } });
            const unsub = this.ai.onChange(send);
            const hb = setInterval(() => subscriber.next({ data: { heartbeat: true } }), 30_000);
            return () => { unsub(); clearInterval(hb); };
        });
    }
    enqueue(u, tenantId, dto) {
        return this.ai.enqueue(u.sub, tenantId, dto);
    }
    list(u, tenantId) {
        return this.ai.listGenerations(u.sub, tenantId);
    }
    get(u, id, req) {
        return this.ai.getGeneration(req.worker ? undefined : u.sub, id);
    }
    submit(u, id, body, req) {
        const payload = body?.raw ?? body?.json;
        if (payload == null) {
            throw new common_1.BadRequestException('Body must include either raw (string) or json (object).');
        }
        return this.ai.submitManualOutput(req.worker ? undefined : u.sub, id, payload);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Sse)('events'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rxjs_1.Observable)
], AiController.prototype, "events", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, GenerateDto]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "enqueue", null);
__decorate([
    (0, common_1.Get)('generations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('generations/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('generations/:id/submit'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, submit_generation_dto_1.SubmitGenerationDto, Object]),
    __metadata("design:returntype", void 0)
], AiController.prototype, "submit", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('ai'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map