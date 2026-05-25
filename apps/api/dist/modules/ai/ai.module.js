"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const ai_controller_1 = require("./ai.controller");
const ai_service_1 = require("./ai.service");
const claude_code_manual_provider_1 = require("./providers/claude-code-manual.provider");
const site_applicator_service_1 = require("./site-applicator.service");
const ai_generation_processor_1 = require("./ai-generation.processor");
const tenants_module_1 = require("../tenants/tenants.module");
const queue_module_1 = require("../../queue/queue.module");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [tenants_module_1.TenantsModule, bullmq_1.BullModule.registerQueue({ name: queue_module_1.QUEUE_AI })],
        controllers: [ai_controller_1.AiController],
        providers: [
            ai_service_1.AiService,
            claude_code_manual_provider_1.ClaudeCodeManualProvider,
            site_applicator_service_1.SiteApplicatorService,
            ai_generation_processor_1.AiGenerationProcessor,
        ],
        exports: [ai_service_1.AiService],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map