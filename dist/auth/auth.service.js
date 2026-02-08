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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const company_service_1 = require("../company/company.service");
const s3_service_1 = require("../chat/s3.service");
const rxjs_1 = require("rxjs");
let AuthService = class AuthService {
    static { AuthService_1 = this; }
    jwtService;
    companyService;
    s3Service;
    configService;
    httpService;
    logger = new common_1.Logger(AuthService_1.name);
    otpStore = new Map();
    static STATIC_OTP = '123456';
    static STATIC_MOBILE = '9003388830';
    msg91AuthKey;
    msg91TemplateId;
    msg91SenderId;
    msg91DltTemplateId;
    gstApiKey;
    gstApiBaseUrl;
    constructor(jwtService, companyService, s3Service, configService, httpService) {
        this.jwtService = jwtService;
        this.companyService = companyService;
        this.s3Service = s3Service;
        this.configService = configService;
        this.httpService = httpService;
        this.msg91AuthKey = this.configService.get('MSG91_AUTH_KEY') || '';
        this.msg91TemplateId = this.configService.get('MSG91_TEMPLATE_ID') || '';
        this.msg91SenderId = this.configService.get('MSG91_SENDER_ID') || '';
        this.msg91DltTemplateId = this.configService.get('MSG91_DLT_TEMPLATE_ID') || '';
        this.gstApiKey = this.configService.get('GST_API_KEY') || '';
        this.gstApiBaseUrl = this.configService.get('GST_API_BASE_URL') || '';
        this.logger.log('AuthService initialized with MSG91 and GST configurations');
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    formatPhoneNumber(phoneNumber) {
        let cleaned = phoneNumber.replace(/[\s+]/g, '');
        if (!cleaned.startsWith('91')) {
            cleaned = '91' + cleaned;
        }
        return cleaned;
    }
    shouldUseStaticOtp(phoneNumber) {
        const cleaned = phoneNumber.replace(/[\s+]/g, '');
        return cleaned.endsWith(AuthService_1.STATIC_MOBILE) ||
            cleaned === AuthService_1.STATIC_MOBILE ||
            cleaned === '91' + AuthService_1.STATIC_MOBILE;
    }
    async sendOtpViaSms(phoneNumber, otp) {
        const formattedPhone = this.formatPhoneNumber(phoneNumber);
        const otpExpiry = 10;
        this.logger.log(`📤 Sending OTP ${otp} to ${formattedPhone} via MSG91`);
        const url = 'https://control.msg91.com/api/v5/flow/';
        const headers = {
            'authkey': this.msg91AuthKey,
            'Content-Type': 'application/json',
        };
        const payload = {
            template_id: this.msg91TemplateId,
            sender: this.msg91SenderId,
            short_url: '0',
            mobiles: formattedPhone,
            var1: otp,
            var2: otpExpiry.toString(),
            DLT_TE_ID: this.msg91DltTemplateId,
        };
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, payload, {
                headers,
                timeout: 15000,
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false
                })
            }).pipe((0, rxjs_1.catchError)((error) => {
                this.logger.error(`❌ MSG91 API Error: ${error.message}`);
                if (error.response) {
                    this.logger.error(`Response status: ${error.response.status}`);
                    this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
                }
                throw error;
            })));
            this.logger.log(`✅ MSG91 Response Status: ${response.status}`);
            this.logger.log(`✅ MSG91 Response: ${JSON.stringify(response.data)}`);
            const responseData = response.data;
            if (response.status === 200 && responseData) {
                if (responseData.type === 'success' || responseData.message?.includes('success')) {
                    this.logger.log(`✅ OTP sent successfully to ${formattedPhone}`);
                    return;
                }
            }
            this.logger.warn(`⚠️ Unexpected MSG91 response: ${JSON.stringify(responseData)}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to send OTP via MSG91`);
            this.logger.error(`Error details: ${JSON.stringify(error)}`);
            throw new common_1.BadRequestException('Failed to send OTP. Please try again or contact support.');
        }
    }
    async sendOtp(loginDto) {
        const phoneNumber = loginDto.phoneNumber;
        let otp;
        if (this.shouldUseStaticOtp(phoneNumber)) {
            otp = AuthService_1.STATIC_OTP;
            this.logger.log(`🔒 Using static OTP for ${phoneNumber}: ${otp}`);
        }
        else {
            otp = this.generateOtp();
            this.logger.log(`🎲 Generated OTP for ${phoneNumber}: ${otp}`);
            try {
                await this.sendOtpViaSms(phoneNumber, otp);
            }
            catch (error) {
                this.logger.error(`Failed to send SMS: ${error.message}`);
                throw new common_1.BadRequestException('Failed to send OTP SMS. Please try again later.');
            }
        }
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        this.otpStore.set(phoneNumber, { otp, expiresAt });
        return {
            message: 'OTP sent successfully',
            data: {
                phoneNumber,
                ...(process.env.NODE_ENV !== 'production' && { otp })
            },
        };
    }
    async verifyOtp(verifyOtpDto) {
        const storedOtp = this.otpStore.get(verifyOtpDto.phoneNumber);
        if (!storedOtp || storedOtp.expiresAt < new Date()) {
            throw new common_1.BadRequestException('OTP not found or expired');
        }
        if (storedOtp.otp !== verifyOtpDto.otp) {
            throw new common_1.UnauthorizedException('Invalid OTP');
        }
        const company = await this.companyService.findByPhone(verifyOtpDto.phoneNumber);
        if (company) {
            const token = this.jwtService.sign({
                companyId: company.id,
                phoneNumber: company.phoneNumber,
            });
            const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);
            return {
                message: 'Login successful',
                data: {
                    token,
                    company: companyWithUrls,
                    isNewUser: false,
                },
            };
        }
        return {
            message: 'OTP verified successfully',
            data: {
                phoneNumber: verifyOtpDto.phoneNumber,
                isNewUser: true,
            },
        };
    }
    async register(registerDto, files) {
        const storedOtp = this.otpStore.get(registerDto.phoneNumber);
        if (!storedOtp || storedOtp.otp !== registerDto.otp) {
            throw new common_1.UnauthorizedException('Invalid OTP for registration');
        }
        let userPhotoKey;
        let logoKey;
        let coverImageKey;
        try {
            if (files?.userPhoto?.[0]) {
                userPhotoKey = await this.s3Service.uploadUserPhoto(files.userPhoto[0]);
            }
            if (files?.logo?.[0]) {
                logoKey = await this.s3Service.uploadCompanyLogo(files.logo[0]);
            }
            if (files?.coverImage?.[0]) {
                coverImageKey = await this.s3Service.uploadCoverImage(files.coverImage[0]);
            }
        }
        catch (error) {
            throw new common_1.BadRequestException(`File upload failed: ${error.message}`);
        }
        const companyData = {
            ...registerDto,
            userPhoto: userPhotoKey || registerDto.userPhoto,
            logo: logoKey || registerDto.logo,
            coverImage: coverImageKey || registerDto.coverImage,
        };
        const company = await this.companyService.create(companyData);
        const token = this.jwtService.sign({
            companyId: company.id,
            phoneNumber: company.phoneNumber,
        });
        this.otpStore.delete(registerDto.phoneNumber);
        const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);
        return {
            message: 'Registration successful',
            data: {
                token,
                company: companyWithUrls,
            },
        };
    }
    async getGstDetails(gstDetailsDto) {
        try {
            if (!this.gstApiKey || !this.gstApiBaseUrl) {
                throw new common_1.HttpException('GST API configuration is missing', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const url = `${this.gstApiBaseUrl}/${this.gstApiKey}/${gstDetailsDto.gstNumber}`;
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url, {
                timeout: 10000,
            }));
            if (!response.data.flag) {
                throw new common_1.HttpException(response.data.message || 'GST number not found', common_1.HttpStatus.NOT_FOUND);
            }
            return response.data;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            if (error.code === 'ECONNABORTED') {
                throw new common_1.HttpException('GST API request timeout', common_1.HttpStatus.REQUEST_TIMEOUT);
            }
            if (error.response) {
                throw new common_1.HttpException(`GST API error: ${error.response.data?.message || error.message}`, error.response.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            throw new common_1.HttpException('Failed to fetch GST details', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        company_service_1.CompanyService,
        s3_service_1.S3Service,
        config_1.ConfigService,
        axios_1.HttpService])
], AuthService);
//# sourceMappingURL=auth.service.js.map