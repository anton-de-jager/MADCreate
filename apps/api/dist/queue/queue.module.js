"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = exports.QUEUE_EMAIL = exports.QUEUE_DOMAIN = exports.QUEUE_DEPLOY = exports.QUEUE_AI = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
exports.QUEUE_AI = 'ai-generation';
exports.QUEUE_DEPLOY = 'deployments';
exports.QUEUE_DOMAIN = 'domain-verification';
exports.QUEUE_EMAIL = 'email';
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        host: config.get('redis.host') ?? 'localhost',
                        port: config.get('redis.port') ?? 6379,
                        password: config.get('redis.password') || undefined,
                    },
                    defaultJobOptions: {
                        removeOnComplete: { age: 3600, count: 1000 },
                        removeOnFail: { age: 86_400 },
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 5_000 },
                    },
                }),
            }),
            bullmq_1.BullModule.registerQueue({ name: exports.QUEUE_AI }, { name: exports.QUEUE_DEPLOY }, { name: exports.QUEUE_DOMAIN }, { name: exports.QUEUE_EMAIL }),
        ],
        exports: [bullmq_1.BullModule],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map