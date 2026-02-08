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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const verify_otp_dto_1 = require("./dto/verify-otp.dto");
const register_dto_1 = require("./dto/register.dto");
const gst_details_dto_1 = require("./dto/gst-details.dto");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async sendOtp(loginDto) {
        return this.authService.sendOtp(loginDto);
    }
    async verifyOtp(verifyOtpDto) {
        return this.authService.verifyOtp(verifyOtpDto);
    }
    async register(registerDto, files) {
        const userPhotoFile = files?.userPhoto?.[0];
        const logoFile = files?.logo?.[0];
        const userPhotoUrl = registerDto.userPhoto;
        const logoUrl = registerDto.logo;
        if (!userPhotoFile && !userPhotoUrl) {
            throw new common_1.BadRequestException('Either userPhoto file or userPhotoUrl must be provided');
        }
        if (!logoFile && !logoUrl) {
            throw new common_1.BadRequestException('Either logo file or logoUrl must be provided');
        }
        return this.authService.register(registerDto, files);
    }
    async getGstDetails(gstDetailsDto) {
        return this.authService.getGstDetails(gstDetailsDto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('send-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Send OTP to phone number' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP sent successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid phone number' }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify OTP and login/check registration status' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'OTP verified successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid or expired OTP' }),
    (0, swagger_1.ApiBody)({ type: verify_otp_dto_1.VerifyOtpDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_otp_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'userPhoto', maxCount: 1 },
        { name: 'logo', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 },
    ])),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Register new company with file uploads',
        description: 'Upload user photo, company logo, and cover image during registration. Can also accept URLs for backward compatibility.'
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Company registered successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Registration failed - invalid data or duplicate entry' }),
    (0, swagger_1.ApiBody)({
        description: 'Registration data with optional file uploads',
        schema: {
            type: 'object',
            properties: {
                phoneNumber: { type: 'string', example: '+919876543210' },
                otp: { type: 'string', example: '936180', minLength: 6, maxLength: 6 },
                gstNumber: { type: 'string', example: '22AAAAA0000A1Z5' },
                companyName: { type: 'string', example: 'Tech Solutions Pvt Ltd' },
                userName: { type: 'string', example: 'John Doe' },
                address: { type: 'string', example: '123 Business Street, Tech City' },
                description: { type: 'string', example: 'Leading provider of tech solutions' },
                referredBy: { type: 'string', example: 'BIZAP1234' },
                category: { type: 'string', example: 'IT Services' },
                userPhoto: {
                    type: 'string',
                    format: 'binary',
                    description: 'User profile photo (JPEG/PNG/WebP, max 5MB) - Optional if userPhotoUrl provided'
                },
                logo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Company logo (JPEG/PNG/WebP, max 5MB) - Optional if logoUrl provided'
                },
                coverImage: {
                    type: 'string',
                    format: 'binary',
                    description: 'Company cover image (JPEG/PNG/WebP, max 5MB) - Optional if coverImageUrl provided'
                },
                userPhotoUrl: {
                    type: 'string',
                    example: 'https://example.com/user.jpg',
                    description: 'User photo URL - Use this if not uploading file'
                },
                logoUrl: {
                    type: 'string',
                    example: 'https://example.com/logo.png',
                    description: 'Company logo URL - Use this if not uploading file'
                },
                coverImageUrl: {
                    type: 'string',
                    example: 'https://example.com/cover.jpg',
                    description: 'Cover image URL - Use this if not uploading file'
                },
            },
            required: ['phoneNumber', 'otp', 'gstNumber', 'companyName', 'userName'],
        },
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('gst-details'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get GST details by GST number (Public)',
        description: 'Fetch complete GST information including company details, address, and business activities. No authentication required.'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'GST details retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                flag: { type: 'boolean', example: true },
                message: { type: 'string', example: 'GSTIN found.' },
                data: {
                    type: 'object',
                    properties: {
                        gstin: { type: 'string', example: '06AACCG0527D1Z8' },
                        lgnm: { type: 'string', example: 'GOOGLE INDIA PRIVATE LIMTED' },
                        tradeNam: { type: 'string', example: 'GOOGLE INDIA PVT LTD' },
                        sts: { type: 'string', example: 'Active' },
                        ctb: { type: 'string', example: 'Private Limited Company' },
                        rgdt: { type: 'string', example: '01/07/2017' },
                        dty: { type: 'string', example: 'Regular' },
                        nba: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['Service Provision', 'Recipient of Goods or Services']
                        },
                        pradr: {
                            type: 'object',
                            properties: {
                                addr: {
                                    type: 'object',
                                    properties: {
                                        bnm: { type: 'string', example: 'Unitech Signature Tower' },
                                        st: { type: 'string', example: 'Sector- 15, Part-I' },
                                        loc: { type: 'string', example: 'Silokhera' },
                                        dst: { type: 'string', example: 'Gurgaon' },
                                        stcd: { type: 'string', example: 'Haryana' },
                                        pncd: { type: 'string', example: '122002' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid GST number format' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'GST number not found' }),
    (0, swagger_1.ApiResponse)({ status: 408, description: 'GST API request timeout' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [gst_details_dto_1.GstDetailsDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getGstDetails", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map