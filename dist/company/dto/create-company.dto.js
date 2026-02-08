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
exports.CreateCompanyDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateCompanyDto {
    phoneNumber;
    gstNumber;
    companyName;
    logo;
    address;
    description;
    category;
    referralCode;
    referredBy;
    userName;
    userPhoto;
    coverImage;
    registeredAddress;
    about;
    operationalAddress;
}
exports.CreateCompanyDto = CreateCompanyDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Indian phone number',
        example: '+919876543210',
    }),
    (0, class_validator_1.IsPhoneNumber)('IN'),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company GST number',
        example: '22AAAAA0000A1Z5',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "gstNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company name',
        example: 'Tech Solutions Pvt Ltd',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company logo URL',
        example: 'https://example.com/logo.png',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "logo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company address',
        example: '123 Business Street, Tech City, State 123456',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company description',
        example: 'Leading provider of technology solutions',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company business category',
        example: 'IT Services',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Referral code provided by a referrer',
        example: 'BIZAP1234',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "referralCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Referral code provided by a referrer (alias)',
        example: 'BIZAP1234',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "referredBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the user registering the company',
        example: 'John Doe',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "userName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'URL to the user\'s profile photo',
        example: 'https://example.com/user.jpg',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "userPhoto", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'URL to the company\'s cover image',
        example: 'https://example.com/cover.jpg',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "coverImage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company registered address',
        example: '123 Corporate Ave, City, State 123456',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "registeredAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Brief description about the company',
        example: 'We are a leading tech company specializing in AI solutions.',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "about", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company operational address',
        example: '456 Tech Park, City, State 123456',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "operationalAddress", void 0);
//# sourceMappingURL=create-company.dto.js.map