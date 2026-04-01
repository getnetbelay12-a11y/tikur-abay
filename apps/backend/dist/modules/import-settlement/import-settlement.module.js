"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportSettlementModule = void 0;
const common_1 = require("@nestjs/common");
const import_settlement_controller_1 = require("./import-settlement.controller");
const import_settlement_service_1 = require("./import-settlement.service");
let ImportSettlementModule = class ImportSettlementModule {
};
exports.ImportSettlementModule = ImportSettlementModule;
exports.ImportSettlementModule = ImportSettlementModule = __decorate([
    (0, common_1.Module)({
        controllers: [import_settlement_controller_1.ImportSettlementController],
        providers: [import_settlement_service_1.ImportSettlementService],
    })
], ImportSettlementModule);
//# sourceMappingURL=import-settlement.module.js.map