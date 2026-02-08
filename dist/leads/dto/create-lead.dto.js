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
exports.CreateLeadWithFileDto = exports.CreateLeadDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateLeadDto {
    title;
    description;
    budget;
    quantity;
    location;
}
exports.CreateLeadDto = CreateLeadDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Lead title',
        example: 'Looking for Web Development Services',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the lead requirement',
        example: 'We need a professional website for our startup with modern design and mobile responsiveness.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Budget for the lead (e.g., $5000)',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "budget", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Quantity required (e.g., 50 units)',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Location of the lead (e.g., San Francisco)',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateLeadDto.prototype, "location", void 0);
class CreateLeadWithFileDto extends CreateLeadDto {
    image;
}
exports.CreateLeadWithFileDto = CreateLeadWithFileDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Lead image file',
        type: 'string',
        format: 'binary',
        required: false,
    }),
    __metadata("design:type", Object)
], CreateLeadWithFileDto.prototype, "image", void 0);
//# sourceMappingURL=create-lead.dto.js.map