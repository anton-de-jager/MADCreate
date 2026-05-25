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
exports.WorkspacesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const workspaces_service_1 = require("./workspaces.service");
class UpdateWorkspaceDto {
    name;
    logoUrl;
    description;
    billingEmail;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateWorkspaceDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateWorkspaceDto.prototype, "logoUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateWorkspaceDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateWorkspaceDto.prototype, "billingEmail", void 0);
class AcceptInviteDto {
    token;
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AcceptInviteDto.prototype, "token", void 0);
class InviteDto {
    email;
    role;
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], InviteDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.Role),
    __metadata("design:type", String)
], InviteDto.prototype, "role", void 0);
let WorkspacesController = class WorkspacesController {
    workspaces;
    constructor(workspaces) {
        this.workspaces = workspaces;
    }
    acceptInvite(user, dto) {
        return this.workspaces.acceptInvite(user.sub, dto.token);
    }
    list(user) {
        return this.workspaces.listMine(user.sub);
    }
    get(user, id) {
        return this.workspaces.get(user.sub, id);
    }
    update(user, id, dto) {
        return this.workspaces.update(user.sub, id, dto);
    }
    invite(user, id, dto) {
        return this.workspaces.invite(user.sub, id, dto);
    }
    members(user, id) {
        return this.workspaces.members(user.sub, id);
    }
    stats(user, id) {
        return this.workspaces.stats(user.sub, id);
    }
    leave(user, id) {
        return this.workspaces.leave(user.sub, id);
    }
};
exports.WorkspacesController = WorkspacesController;
__decorate([
    (0, common_1.Post)('invites/accept'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, AcceptInviteDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "acceptInvite", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, UpdateWorkspaceDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/invites'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, InviteDto]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "invite", null);
__decorate([
    (0, common_1.Get)(':id/members'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "members", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "stats", null);
__decorate([
    (0, common_1.Post)(':id/members/leave'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], WorkspacesController.prototype, "leave", null);
exports.WorkspacesController = WorkspacesController = __decorate([
    (0, swagger_1.ApiTags)('workspaces'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('workspaces'),
    __metadata("design:paramtypes", [workspaces_service_1.WorkspacesService])
], WorkspacesController);
//# sourceMappingURL=workspaces.controller.js.map