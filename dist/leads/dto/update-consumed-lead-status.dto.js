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
exports.UpdateConsumedLeadStatusDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const consumed_lead_entity_1 = require("../entities/consumed-lead.entity");
class UpdateConsumedLeadStatusDto {
    dealStatus;
    dealNotes;
    dealValue;
}
exports.UpdateConsumedLeadStatusDto = UpdateConsumedLeadStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: consumed_lead_entity_1.DealStatus,
        example: consumed_lead_entity_1.DealStatus.COMPLETED,
        description: 'Current status of the deal',
    }),
    (0, class_validator_1.IsEnum)(consumed_lead_entity_1.DealStatus),
    __metadata("design:type", String)
], UpdateConsumedLeadStatusDto.prototype, "dealStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Notes about the deal outcome',
        example: 'Successfully closed the deal. Great lead quality!',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateConsumedLeadStatusDto.prototype, "dealNotes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Deal value in INR (required for COMPLETED status)',
        example: 50000,
        required: false,
    }),
    (0, class_validator_1.ValidateIf)(o => o.dealStatus === consumed_lead_entity_1.DealStatus.COMPLETED),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateConsumedLeadStatusDto.prototype, "dealValue", void 0);
//# sourceMappingURL=update-consumed-lead-status.dto.js.map