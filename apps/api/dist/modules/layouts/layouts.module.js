"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutsModule = void 0;
const common_1 = require("@nestjs/common");
const layouts_controller_1 = require("./layouts.controller");
const layouts_service_1 = require("./layouts.service");
const tenants_module_1 = require("../tenants/tenants.module");
let LayoutsModule = class LayoutsModule {
};
exports.LayoutsModule = LayoutsModule;
exports.LayoutsModule = LayoutsModule = __decorate([
    (0, common_1.Module)({
        imports: [tenants_module_1.TenantsModule],
        controllers: [layouts_controller_1.LayoutsController],
        providers: [layouts_service_1.LayoutsService],
    })
], LayoutsModule);
//# sourceMappingURL=layouts.module.js.map