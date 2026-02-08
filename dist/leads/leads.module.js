"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const platform_express_1 = require("@nestjs/platform-express");
const config_1 = require("@nestjs/config");
const leads_service_1 = require("./leads.service");
const ai_lead_extraction_service_1 = require("./ai-lead-extraction.service");
const leads_controller_1 = require("./leads.controller");
const admin_leads_controller_1 = require("./admin.leads.controller");
const lead_entity_1 = require("./entities/lead.entity");
const consumed_lead_entity_1 = require("./entities/consumed-lead.entity");
const company_module_1 = require("../company/company.module");
const notifications_module_1 = require("../notifications/notifications.module");
const s3_service_1 = require("../chat/s3.service");
const multer = __importStar(require("multer"));
let LeadsModule = class LeadsModule {
};
exports.LeadsModule = LeadsModule;
exports.LeadsModule = LeadsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([lead_entity_1.Lead, consumed_lead_entity_1.ConsumedLead]),
            company_module_1.CompanyModule,
            notifications_module_1.NotificationsModule,
            platform_express_1.MulterModule.register({
                storage: multer.memoryStorage(),
                limits: {
                    fileSize: 10 * 1024 * 1024,
                },
            }),
        ],
        controllers: [leads_controller_1.LeadsController, admin_leads_controller_1.AdminLeadsController],
        providers: [
            leads_service_1.LeadsService,
            ai_lead_extraction_service_1.AiLeadExtractionService,
            s3_service_1.S3Service
        ],
        exports: [leads_service_1.LeadsService],
    })
], LeadsModule);
//# sourceMappingURL=leads.module.js.map