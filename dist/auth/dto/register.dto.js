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
exports.RegisterDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RegisterDto {
    phoneNumber;
    otp;
    gstNumber;
    companyName;
    userName;
    userPhoto;
    logo;
    coverImage;
    address;
    description;
    referredBy;
    category;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Indian phone number',
        example: '+919876543210',
    }),
    (0, class_validator_1.IsPhoneNumber)('IN'),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '6-digit OTP code',
        example: '936180',
        minLength: 6,
        maxLength: 6,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(6, 6),
    __metadata("design:type", String)
], RegisterDto.prototype, "otp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company GST number',
        example: '22AAAAA0000A1Z5',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "gstNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company name',
        example: 'Tech Solutions Pvt Ltd',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the user registering the company',
        example: 'John Doe',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "userName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'URL to the user\'s profile photo (ignored if file is uploaded)',
        example: 'https://example.com/user.jpg',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "userPhoto", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company logo URL (ignored if file is uploaded)',
        example: 'https://example.com/logo.png',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "logo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company cover image URL (ignored if file is uploaded)',
        example: 'https://example.com/cover.jpg',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "coverImage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company address',
        example: '123 Business Street, Tech City, State 123456',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company description',
        example: 'Leading provider of technology solutions',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Referral code provided by a referrer',
        example: 'BIZAP1234',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "referredBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company business category',
        example: 'IT Services',
        required: false,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "category", void 0);
//# sourceMappingURL=register.dto.js.map