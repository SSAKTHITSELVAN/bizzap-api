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
exports.Notification = exports.NotificationType = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("../../company/entities/company.entity");
const lead_entity_1 = require("../../leads/entities/lead.entity");
var NotificationType;
(function (NotificationType) {
    NotificationType["NEW_LEAD"] = "NEW_LEAD";
    NotificationType["LEAD_CONSUMED"] = "LEAD_CONSUMED";
    NotificationType["ADMIN_BROADCAST"] = "ADMIN_BROADCAST";
    NotificationType["SYSTEM"] = "SYSTEM";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
let Notification = class Notification {
    id;
    companyId;
    type;
    title;
    body;
    data;
    isRead;
    leadId;
    createdAt;
    updatedAt;
    company;
    lead;
};
exports.Notification = Notification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Notification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Notification.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: NotificationType,
    }),
    __metadata("design:type", String)
], Notification.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Notification.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Notification.prototype, "body", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], Notification.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Notification.prototype, "isRead", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Notification.prototype, "leadId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Notification.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Notification.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, { nullable: true, onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'companyId' }),
    __metadata("design:type", company_entity_1.Company)
], Notification.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lead_entity_1.Lead, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'leadId' }),
    __metadata("design:type", lead_entity_1.Lead)
], Notification.prototype, "lead", void 0);
exports.Notification = Notification = __decorate([
    (0, typeorm_1.Entity)('notifications')
], Notification);
//# sourceMappingURL=notification.entity.js.map