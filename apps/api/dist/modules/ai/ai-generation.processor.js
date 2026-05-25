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
exports.AiGenerationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const ai_service_1 = require("./ai.service");
const queue_module_1 = require("../../queue/queue.module");
let AiGenerationProcessor = class AiGenerationProcessor extends bullmq_1.WorkerHost {
    ai;
    constructor(ai) {
        super();
        this.ai = ai;
    }
    async process(job) {
        await this.ai.run(job.data.generationId, job.data.request);
    }
};
exports.AiGenerationProcessor = AiGenerationProcessor;
exports.AiGenerationProcessor = AiGenerationProcessor = __decorate([
    (0, bullmq_1.Processor)(queue_module_1.QUEUE_AI),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiGenerationProcessor);
//# sourceMappingURL=ai-generation.processor.js.map