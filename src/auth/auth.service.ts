// src/modules/auth/auth.service.ts - UPDATED WITH S3 UPLOAD
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CompanyService } from '../company/company.service';
import { S3Service } from '../chat/s3.service'; // Import S3Service
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();
  private static readonly STATIC_OTP = '936180'; // Static OTP for development

  constructor(
    private jwtService: JwtService,
    private companyService: CompanyService,
    private s3Service: S3Service, // Inject S3Service
  ) {}

  async sendOtp(loginDto: LoginDto) {
    const otp = AuthService.STATIC_OTP;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

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
      // Existing user - login
      const token = this.jwtService.sign({
        companyId: company.id,
        phoneNumber: company.phoneNumber,
      });

      // Generate signed URLs for S3 assets
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
    // Verify OTP again for registration
    const storedOtp = this.otpStore.get(registerDto.phoneNumber);
    if (!storedOtp || storedOtp.otp !== registerDto.otp) {
      throw new UnauthorizedException('Invalid OTP for registration');
    }

    // Upload files to S3 if provided
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

    // Prepare company data
    const companyData = {
      ...registerDto,
      // Use uploaded S3 keys if available, otherwise use provided URLs
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

    // Generate signed URLs for response
    const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);

    return {
      message: 'Registration successful',
      data: {
        token,
        company: companyWithUrls,
      },
    };
  }
}