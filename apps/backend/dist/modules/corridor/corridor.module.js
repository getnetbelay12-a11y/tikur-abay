"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorridorModule = void 0;
const common_1 = require("@nestjs/common");
const communications_module_1 = require("../communications/communications.module");
const corridor_controller_1 = require("./corridor.controller");
const shipments_controller_1 = require("./shipments.controller");
const corridor_service_1 = require("./corridor.service");
let CorridorModule = class CorridorModule {
};
exports.CorridorModule = CorridorModule;
exports.CorridorModule = CorridorModule = __decorate([
    (0, common_1.Module)({
        imports: [communications_module_1.CommunicationsModule],
        controllers: [corridor_controller_1.CorridorController, shipments_controller_1.ShipmentsController],
        providers: [corridor_service_1.CorridorService],
        exports: [corridor_service_1.CorridorService],
    })
], CorridorModule);
//# sourceMappingURL=corridor.module.js.map