// src/modules/auth/auth.service.ts - UPDATED WITH GST DETAILS ENDPOINT
import { Injectable, BadRequestException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
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
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();
  private static readonly STATIC_OTP = '936180';
  private readonly gstApiKey: string;
  private readonly gstApiBaseUrl: string;

  constructor(
    private jwtService: JwtService,
    private companyService: CompanyService,
    private s3Service: S3Service,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.gstApiKey = this.configService.get<string>('GST_API_KEY') || '';
    this.gstApiBaseUrl = this.configService.get<string>('GST_API_BASE_URL') || '';
  }

  async sendOtp(loginDto: LoginDto) {
    const otp = AuthService.STATIC_OTP;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    this.otpStore.set(loginDto.phoneNumber, { otp, expiresAt });

    console.log(`OTP for ${loginDto.phoneNumber}: ${otp}`);

    return {
      message: 'OTP sent successfully',
      data: { phoneNumber: loginDto.phoneNumber },
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const storedOtp = this.otpStore.get(verifyOtpDto.phoneNumber);
    
    if (!storedOtp || storedOtp.expiresAt < new Date()) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (storedOtp.otp !== verifyOtpDto.otp) {
      throw new UnauthorizedException('Invalid OTP');
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

  async register(
    registerDto: RegisterDto,
    files?: { 
      userPhoto?: Express.Multer.File[], 
      logo?: Express.Multer.File[],
      coverImage?: Express.Multer.File[]
    }
  ) {
    const storedOtp = this.otpStore.get(registerDto.phoneNumber);
    if (!storedOtp || storedOtp.otp !== registerDto.otp) {
      throw new UnauthorizedException('Invalid OTP for registration');
    }

    let userPhotoKey: string | undefined;
    let logoKey: string | undefined;
    let coverImageKey: string | undefined;

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
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
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

  /**
   * Get GST details by GST number
   * @param gstDetailsDto - Contains the GST number to query
   * @returns GST details from the API
   */
  async getGstDetails(gstDetailsDto: GstDetailsDto): Promise<GstApiResponse> {
    try {
      if (!this.gstApiKey || !this.gstApiBaseUrl) {
        throw new HttpException(
          'GST API configuration is missing',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const url = `${this.gstApiBaseUrl}/${this.gstApiKey}/${gstDetailsDto.gstNumber}`;
      
      const response = await firstValueFrom(
        this.httpService.get<GstApiResponse>(url, {
          timeout: 10000, // 10 second timeout
        })
      );

      if (!response.data.flag) {
        throw new HttpException(
          response.data.message || 'GST number not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.code === 'ECONNABORTED') {
        throw new HttpException(
          'GST API request timeout',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      if (error.response) {
        throw new HttpException(
          `GST API error: ${error.response.data?.message || error.message}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Failed to fetch GST details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}