"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormsModule = void 0;
const common_1 = require("@nestjs/common");
const tenants_module_1 = require("../tenants/tenants.module");
const forms_controller_1 = require("./forms.controller");
const leads_controller_1 = require("./leads.controller");
const forms_service_1 = require("./forms.service");
const leads_service_1 = require("./leads.service");
let FormsModule = class FormsModule {
};
exports.FormsModule = FormsModule;
exports.FormsModule = FormsModule = __decorate([
    (0, common_1.Module)({
        imports: [tenants_module_1.TenantsModule],
        controllers: [forms_controller_1.FormsController, leads_controller_1.LeadsController],
        providers: [forms_service_1.FormsService, leads_service_1.LeadsService],
        exports: [forms_service_1.FormsService, leads_service_1.LeadsService],
    })
], FormsModule);
//# sourceMappingURL=forms.module.js.map