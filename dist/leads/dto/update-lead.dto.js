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
exports.UpdateLeadDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_lead_dto_1 = require("./create-lead.dto");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateLeadDto extends (0, mapped_types_1.PartialType)(create_lead_dto_1.CreateLeadDto) {
    title;
    description;
    image;
    budget;
    quantity;
    location;
    reasonForDeactivation;
}
exports.UpdateLeadDto = UpdateLeadDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Lead title',
        example: 'Updated Lead Title',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeadDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the lead requirement',
        example: 'Updated description for the lead.',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeadDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Optional image URL for the lead',
        example: 'https://example.com/updated-lead-image.jpg',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeadDto.prototype, "image", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Budget for the lead',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeadDto.prototype, "budget", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Quantity required',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeadDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Location of the lead',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeadDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for deactivating the lead',
        example: 'Lead requirement fulfilled',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateLeadDto.prototype, "reasonForDeactivation", void 0);
//# sourceMappingURL=update-lead.dto.js.map