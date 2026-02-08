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
exports.UpdateCompanyDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_company_dto_1 = require("./create-company.dto");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateCompanyDto extends (0, mapped_types_1.PartialType)((0, mapped_types_1.OmitType)(create_company_dto_1.CreateCompanyDto, ['phoneNumber', 'gstNumber', 'referralCode', 'referredBy'])) {
    companyName;
    logo;
    address;
    description;
    category;
    userName;
    userPhoto;
    coverImage;
    registeredAddress;
    about;
    operationalAddress;
}
exports.UpdateCompanyDto = UpdateCompanyDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company name',
        example: 'Tech Solutions Pvt Ltd',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company logo URL or file',
        example: 'https://example.com/logo.png',
        required: false,
        type: 'string',
        format: 'binary',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "logo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company address',
        example: '123 Business Street, Tech City, State 123456',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company description',
        example: 'Leading provider of technology solutions',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company business category',
        example: 'IT Services',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the user',
        example: 'Jane Doe',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "userName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User profile photo URL or file',
        example: 'https://example.com/user-new.jpg',
        required: false,
        type: 'string',
        format: 'binary',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "userPhoto", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company cover image URL or file',
        example: 'https://example.com/cover-new.jpg',
        required: false,
        type: 'string',
        format: 'binary',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "coverImage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company registered address',
        example: '789 Industrial Drive, City, State 123456',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "registeredAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Brief description about the company',
        example: 'We have updated our services to include cloud computing.',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "about", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company operational address',
        example: '101 Tech Plaza, City, State 123456',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCompanyDto.prototype, "operationalAddress", void 0);
//# sourceMappingURL=update-company.dto.js.map