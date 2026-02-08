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
exports.LeadQuotaDetailsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class LeadQuotaDetailsDto {
    totalLeadQuota;
    consumedLeads;
    remainingLeads;
    postingQuota;
    postedLeads;
    remainingPosts;
    nextResetDate;
    daysUntilReset;
    referralCode;
    referralInfo;
}
exports.LeadQuotaDetailsDto = LeadQuotaDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total lead quota available for the month',
        example: 25,
    }),
    __metadata("design:type", Number)
], LeadQuotaDetailsDto.prototype, "totalLeadQuota", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of leads consumed this month',
        example: 10,
    }),
    __metadata("design:type", Number)
], LeadQuotaDetailsDto.prototype, "consumedLeads", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Remaining leads available to consume',
        example: 15,
    }),
    __metadata("design:type", Number)
], LeadQuotaDetailsDto.prototype, "remainingLeads", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Total posting quota for the month',
        example: 30,
    }),
    __metadata("design:type", Number)
], LeadQuotaDetailsDto.prototype, "postingQuota", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of leads posted this month',
        example: 5,
    }),
    __metadata("design:type", Number)
], LeadQuotaDetailsDto.prototype, "postedLeads", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Remaining posts available',
        example: 25,
    }),
    __metadata("design:type", Number)
], LeadQuotaDetailsDto.prototype, "remainingPosts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Next quota reset date (1st of next month at 00:00)',
        example: '2025-01-01T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], LeadQuotaDetailsDto.prototype, "nextResetDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Days remaining until quota reset',
        example: 9,
    }),
    __metadata("design:type", Number)
], LeadQuotaDetailsDto.prototype, "daysUntilReset", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company referral code for earning bonus leads',
        example: 'BIZAP1234',
    }),
    __metadata("design:type", String)
], LeadQuotaDetailsDto.prototype, "referralCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Information about earning more leads',
        example: 'Share your referral code to earn 5 bonus leads per successful referral!',
    }),
    __metadata("design:type", String)
], LeadQuotaDetailsDto.prototype, "referralInfo", void 0);
//# sourceMappingURL=lead-quota-details.dto.js.map