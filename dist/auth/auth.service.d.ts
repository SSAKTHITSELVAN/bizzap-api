import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CompanyService } from '../company/company.service';
import { S3Service } from '../chat/s3.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { GstDetailsDto } from './dto/gst-details.dto';
import { GstApiResponse } from './dto/gst-response.dto';
export declare class AuthService {
    private jwtService;
    private companyService;
    private s3Service;
    private configService;
    private httpService;
    private readonly logger;
    private otpStore;
    private static readonly STATIC_OTP;
    private static readonly STATIC_MOBILE;
    private readonly msg91AuthKey;
    private readonly msg91TemplateId;
    private readonly msg91SenderId;
    private readonly msg91DltTemplateId;
    private readonly gstApiKey;
    private readonly gstApiBaseUrl;
    constructor(jwtService: JwtService, companyService: CompanyService, s3Service: S3Service, configService: ConfigService, httpService: HttpService);
    private generateOtp;
    private formatPhoneNumber;
    private shouldUseStaticOtp;
    private sendOtpViaSms;
    sendOtp(loginDto: LoginDto): Promise<{
        message: string;
        data: {
            otp?: string | undefined;
            phoneNumber: string;
        };
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        message: string;
        data: {
            token: string;
            company: any;
            isNewUser: boolean;
            phoneNumber?: undefined;
        };
    } | {
        message: string;
        data: {
            phoneNumber: string;
            isNewUser: boolean;
            token?: undefined;
            company?: undefined;
        };
    }>;
    register(registerDto: RegisterDto, files?: {
        userPhoto?: Express.Multer.File[];
        logo?: Express.Multer.File[];
        coverImage?: Express.Multer.File[];
    }): Promise<{
        message: string;
        data: {
            token: string;
            company: any;
        };
    }>;
    getGstDetails(gstDetailsDto: GstDetailsDto): Promise<GstApiResponse>;
}
