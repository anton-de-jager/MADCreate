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
exports.LayoutsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const layouts_service_1 = require("./layouts.service");
const create_layout_dto_1 = require("./dto/create-layout.dto");
const update_layout_dto_1 = require("./dto/update-layout.dto");
let LayoutsController = class LayoutsController {
    layouts;
    constructor(layouts) {
        this.layouts = layouts;
    }
    list(u, tenantId) { return this.layouts.list(u.sub, tenantId); }
    get(u, id) { return this.layouts.get(u.sub, id); }
    create(u, tenantId, dto) {
        return this.layouts.create(u.sub, tenantId, dto);
    }
    update(u, id, dto) {
        return this.layouts.update(u.sub, id, dto);
    }
};
exports.LayoutsController = LayoutsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LayoutsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LayoutsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_layout_dto_1.CreateLayoutDto]),
    __metadata("design:returntype", void 0)
], LayoutsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_layout_dto_1.UpdateLayoutDto]),
    __metadata("design:returntype", void 0)
], LayoutsController.prototype, "update", null);
exports.LayoutsController = LayoutsController = __decorate([
    (0, swagger_1.ApiTags)('layouts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('layouts'),
    __metadata("design:paramtypes", [layouts_service_1.LayoutsService])
], LayoutsController);
//# sourceMappingURL=layouts.controller.js.map