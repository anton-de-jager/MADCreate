"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemesModule = void 0;
const common_1 = require("@nestjs/common");
const themes_controller_1 = require("./themes.controller");
const themes_service_1 = require("./themes.service");
const tenants_module_1 = require("../tenants/tenants.module");
let ThemesModule = class ThemesModule {
};
exports.ThemesModule = ThemesModule;
exports.ThemesModule = ThemesModule = __decorate([
    (0, common_1.Module)({
        imports: [tenants_module_1.TenantsModule],
        controllers: [themes_controller_1.ThemesController],
        providers: [themes_service_1.ThemesService],
        exports: [themes_service_1.ThemesService],
    })
], ThemesModule);
//# sourceMappingURL=themes.module.js.map