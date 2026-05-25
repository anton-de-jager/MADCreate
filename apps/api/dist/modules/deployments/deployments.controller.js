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
exports.DeploymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const rxjs_1 = require("rxjs");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const deployments_service_1 = require("./deployments.service");
class TriggerDeploymentDto {
    siteId;
    target;
    config;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TriggerDeploymentDto.prototype, "siteId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.DeploymentTarget),
    __metadata("design:type", String)
], TriggerDeploymentDto.prototype, "target", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], TriggerDeploymentDto.prototype, "config", void 0);
let DeploymentsController = class DeploymentsController {
    deployments;
    constructor(deployments) {
        this.deployments = deployments;
    }
    events() {
        return new rxjs_1.Observable((subscriber) => {
            const send = () => subscriber.next({ data: { ts: Date.now() } });
            const unsub = this.deployments.onChange(send);
            const hb = setInterval(() => subscriber.next({ data: { heartbeat: true } }), 30_000);
            return () => { unsub(); clearInterval(hb); };
        });
    }
    list(u, tenantId) { return this.deployments.list(u.sub, tenantId); }
    get(u, id) { return this.deployments.get(u.sub, id); }
    trigger(u, tenantId, dto) {
        return this.deployments.trigger(u.sub, tenantId, dto);
    }
    cancel(u, id) { return this.deployments.cancel(u.sub, id); }
};
exports.DeploymentsController = DeploymentsController;
__decorate([
    (0, common_1.Sse)('events'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", rxjs_1.Observable)
], DeploymentsController.prototype, "events", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeploymentsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeploymentsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, TriggerDeploymentDto]),
    __metadata("design:returntype", void 0)
], DeploymentsController.prototype, "trigger", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeploymentsController.prototype, "cancel", null);
exports.DeploymentsController = DeploymentsController = __decorate([
    (0, swagger_1.ApiTags)('deployments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('deployments'),
    __metadata("design:paramtypes", [deployments_service_1.DeploymentsService])
], DeploymentsController);
//# sourceMappingURL=deployments.controller.js.map