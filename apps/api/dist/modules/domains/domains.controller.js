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
exports.DomainsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const domains_service_1 = require("./domains.service");
class AddDomainDto {
    hostname;
    type;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddDomainDto.prototype, "hostname", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.DomainType),
    __metadata("design:type", String)
], AddDomainDto.prototype, "type", void 0);
let DomainsController = class DomainsController {
    domains;
    constructor(domains) {
        this.domains = domains;
    }
    list(user, tenantId) {
        return this.domains.list(user.sub, tenantId);
    }
    add(user, tenantId, dto) {
        return this.domains.add(user.sub, tenantId, dto);
    }
    instructions(user, id) {
        return this.domains.instructions(user.sub, id);
    }
    verify(user, id) {
        return this.domains.verify(user.sub, id);
    }
    remove(user, id) {
        return this.domains.remove(user.sub, id);
    }
};
exports.DomainsController = DomainsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DomainsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, AddDomainDto]),
    __metadata("design:returntype", void 0)
], DomainsController.prototype, "add", null);
__decorate([
    (0, common_1.Get)(':id/instructions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DomainsController.prototype, "instructions", null);
__decorate([
    (0, common_1.Post)(':id/verify'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DomainsController.prototype, "verify", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DomainsController.prototype, "remove", null);
exports.DomainsController = DomainsController = __decorate([
    (0, swagger_1.ApiTags)('domains'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('domains'),
    __metadata("design:paramtypes", [domains_service_1.DomainsService])
], DomainsController);
//# sourceMappingURL=domains.controller.js.map