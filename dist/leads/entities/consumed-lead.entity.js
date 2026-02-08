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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsumedLead = exports.DealStatus = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("../../company/entities/company.entity");
const lead_entity_1 = require("./lead.entity");
var DealStatus;
(function (DealStatus) {
    DealStatus["PENDING"] = "PENDING";
    DealStatus["COMPLETED"] = "COMPLETED";
    DealStatus["FAILED"] = "FAILED";
    DealStatus["NO_RESPONSE"] = "NO_RESPONSE";
})(DealStatus || (exports.DealStatus = DealStatus = {}));
let ConsumedLead = class ConsumedLead {
    id;
    companyId;
    leadId;
    consumedAt;
    dealStatus;
    dealNotes;
    dealValue;
    statusUpdatedAt;
    updatedAt;
    company;
    lead;
};
exports.ConsumedLead = ConsumedLead;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ConsumedLead.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ConsumedLead.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ConsumedLead.prototype, "leadId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ConsumedLead.prototype, "consumedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DealStatus,
        default: DealStatus.PENDING,
    }),
    __metadata("design:type", String)
], ConsumedLead.prototype, "dealStatus", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], ConsumedLead.prototype, "dealNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ConsumedLead.prototype, "dealValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ConsumedLead.prototype, "statusUpdatedAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ConsumedLead.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company),
    (0, typeorm_1.JoinColumn)({ name: 'companyId' }),
    __metadata("design:type", company_entity_1.Company)
], ConsumedLead.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lead_entity_1.Lead),
    (0, typeorm_1.JoinColumn)({ name: 'leadId' }),
    __metadata("design:type", lead_entity_1.Lead)
], ConsumedLead.prototype, "lead", void 0);
exports.ConsumedLead = ConsumedLead = __decorate([
    (0, typeorm_1.Entity)('consumed_leads')
], ConsumedLead);
//# sourceMappingURL=consumed-lead.entity.js.map