"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrivingSchoolModule = void 0;
const common_1 = require("@nestjs/common");
const driving_school_controller_1 = require("./driving-school.controller");
const driving_school_service_1 = require("./driving-school.service");
let DrivingSchoolModule = class DrivingSchoolModule {
};
exports.DrivingSchoolModule = DrivingSchoolModule;
exports.DrivingSchoolModule = DrivingSchoolModule = __decorate([
    (0, common_1.Module)({
        controllers: [driving_school_controller_1.DrivingSchoolController],
        providers: [driving_school_service_1.DrivingSchoolService],
    })
], DrivingSchoolModule);
//# sourceMappingURL=driving-school.module.js.map