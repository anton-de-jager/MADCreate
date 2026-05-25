"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderModule = void 0;
const common_1 = require("@nestjs/common");
const render_controller_1 = require("./render.controller");
const render_service_1 = require("./render.service");
const domains_module_1 = require("../domains/domains.module");
let RenderModule = class RenderModule {
};
exports.RenderModule = RenderModule;
exports.RenderModule = RenderModule = __decorate([
    (0, common_1.Module)({ imports: [domains_module_1.DomainsModule], controllers: [render_controller_1.RenderController], providers: [render_service_1.RenderService] })
], RenderModule);
//# sourceMappingURL=render.module.js.map