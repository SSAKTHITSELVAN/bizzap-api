// // src/modules/auth/auth.service.ts - UPDATED WITH GST DETAILS ENDPOINT
// import { Injectable, BadRequestException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { ConfigService } from '@nestjs/config';
// import { HttpService } from '@nestjs/axios';
// import { CompanyService } from '../company/company.service';
// import { S3Service } from '../chat/s3.service';
// import { LoginDto } from './dto/login.dto';
// import { VerifyOtpDto } from './dto/verify-otp.dto';
// import { RegisterDto } from './dto/register.dto';
// import { GstDetailsDto } from './dto/gst-details.dto';
// import { GstApiResponse } from './dto/gst-response.dto';
// import { firstValueFrom } from 'rxjs';

// @Injectable()
// export class AuthService {
//   private otpStore = new Map<string, { otp: string; expiresAt: Date }>();
//   private static readonly STATIC_OTP = '936180';
//   private readonly gstApiKey: string;
//   private readonly gstApiBaseUrl: string;

//   constructor(
//     private jwtService: JwtService,
//     private companyService: CompanyService,
//     private s3Service: S3Service,
//     private configService: ConfigService,
//     private httpService: HttpService,
//   ) {
//     this.gstApiKey = this.configService.get<string>('GST_API_KEY') || '';
//     this.gstApiBaseUrl = this.configService.get<string>('GST_API_BASE_URL') || '';
//   }

//   async sendOtp(loginDto: LoginDto) {
//     const otp = AuthService.STATIC_OTP;
//     const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     this.otpStore.set(loginDto.phoneNumber, { otp, expiresAt });

//     console.log(`OTP for ${loginDto.phoneNumber}: ${otp}`);

//     return {
//       message: 'OTP sent successfully',
//       data: { phoneNumber: loginDto.phoneNumber },
//     };
//   }

//   async verifyOtp(verifyOtpDto: VerifyOtpDto) {
//     const storedOtp = this.otpStore.get(verifyOtpDto.phoneNumber);
    
//     if (!storedOtp || storedOtp.expiresAt < new Date()) {
//       throw new BadRequestException('OTP not found or expired');
//     }

//     if (storedOtp.otp !== verifyOtpDto.otp) {
//       throw new UnauthorizedException('Invalid OTP');
//     }

//     const company = await this.companyService.findByPhone(verifyOtpDto.phoneNumber);
    
//     if (company) {
//       const token = this.jwtService.sign({
//         companyId: company.id,
//         phoneNumber: company.phoneNumber,
//       });

//       const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);

//       return {
//         message: 'Login successful',
//         data: {
//           token,
//           company: companyWithUrls,
//           isNewUser: false,
//         },
//       };
//     }

//     return {
//       message: 'OTP verified successfully',
//       data: {
//         phoneNumber: verifyOtpDto.phoneNumber,
//         isNewUser: true,
//       },
//     };
//   }

//   async register(
//     registerDto: RegisterDto,
//     files?: { 
//       userPhoto?: Express.Multer.File[], 
//       logo?: Express.Multer.File[],
//       coverImage?: Express.Multer.File[]
//     }
//   ) {
//     const storedOtp = this.otpStore.get(registerDto.phoneNumber);
//     if (!storedOtp || storedOtp.otp !== registerDto.otp) {
//       throw new UnauthorizedException('Invalid OTP for registration');
//     }

//     let userPhotoKey: string | undefined;
//     let logoKey: string | undefined;
//     let coverImageKey: string | undefined;

//     try {
//       if (files?.userPhoto?.[0]) {
//         userPhotoKey = await this.s3Service.uploadUserPhoto(files.userPhoto[0]);
//       }

//       if (files?.logo?.[0]) {
//         logoKey = await this.s3Service.uploadCompanyLogo(files.logo[0]);
//       }

//       if (files?.coverImage?.[0]) {
//         coverImageKey = await this.s3Service.uploadCoverImage(files.coverImage[0]);
//       }
//     } catch (error) {
//       throw new BadRequestException(`File upload failed: ${error.message}`);
//     }

//     const companyData = {
//       ...registerDto,
//       userPhoto: userPhotoKey || registerDto.userPhoto,
//       logo: logoKey || registerDto.logo,
//       coverImage: coverImageKey || registerDto.coverImage,
//     };

//     const company = await this.companyService.create(companyData);

//     const token = this.jwtService.sign({
//       companyId: company.id,
//       phoneNumber: company.phoneNumber,
//     });

//     this.otpStore.delete(registerDto.phoneNumber);

//     const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);

//     return {
//       message: 'Registration successful',
//       data: {
//         token,
//         company: companyWithUrls,
//       },
//     };
//   }

//   /**
//    * Get GST details by GST number
//    * @param gstDetailsDto - Contains the GST number to query
//    * @returns GST details from the API
//    */
//   async getGstDetails(gstDetailsDto: GstDetailsDto): Promise<GstApiResponse> {
//     try {
//       if (!this.gstApiKey || !this.gstApiBaseUrl) {
//         throw new HttpException(
//           'GST API configuration is missing',
//           HttpStatus.INTERNAL_SERVER_ERROR,
//         );
//       }

//       const url = `${this.gstApiBaseUrl}/${this.gstApiKey}/${gstDetailsDto.gstNumber}`;
      
//       const response = await firstValueFrom(
//         this.httpService.get<GstApiResponse>(url, {
//           timeout: 10000, // 10 second timeout
//         })
//       );

//       if (!response.data.flag) {
//         throw new HttpException(
//           response.data.message || 'GST number not found',
//           HttpStatus.NOT_FOUND,
//         );
//       }

//       return response.data;
//     } catch (error) {
//       if (error instanceof HttpException) {
//         throw error;
//       }

//       if (error.code === 'ECONNABORTED') {
//         throw new HttpException(
//           'GST API request timeout',
//           HttpStatus.REQUEST_TIMEOUT,
//         );
//       }

//       if (error.response) {
//         throw new HttpException(
//           `GST API error: ${error.response.data?.message || error.message}`,
//           error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
//         );
//       }

//       throw new HttpException(
//         'Failed to fetch GST details',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
// }



// src/modules/auth/auth.service.ts - UPDATED WITH REAL MSG91 OTP INTEGRATION (FIXED)
import { Injectable, BadRequestException, UnauthorizedException, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
import { firstValueFrom, catchError, timeout } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private otpStore = new Map<string, { otp: string; expiresAt: Date }>();
  
  // Static OTP configuration - ONLY for mobile 9003388830
  private static readonly STATIC_OTP = '123456';
  private static readonly STATIC_MOBILE = '9003388830';
  
  // MSG91 Configuration
  private readonly msg91AuthKey: string;
  private readonly msg91TemplateId: string;
  private readonly msg91SenderId: string;
  private readonly msg91DltTemplateId: string;
  
  // GST Configuration
  private readonly gstApiKey: string;
  private readonly gstApiBaseUrl: string;

  constructor(
    private jwtService: JwtService,
    private companyService: CompanyService,
    private s3Service: S3Service,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    // Initialize MSG91 credentials
    this.msg91AuthKey = this.configService.get<string>('MSG91_AUTH_KEY') || '';
    this.msg91TemplateId = this.configService.get<string>('MSG91_TEMPLATE_ID') || '';
    this.msg91SenderId = this.configService.get<string>('MSG91_SENDER_ID') || '';
    this.msg91DltTemplateId = this.configService.get<string>('MSG91_DLT_TEMPLATE_ID') || '';
    
    // Initialize GST credentials
    this.gstApiKey = this.configService.get<string>('GST_API_KEY') || '';
    this.gstApiBaseUrl = this.configService.get<string>('GST_API_BASE_URL') || '';
    
    this.logger.log('AuthService initialized with MSG91 and GST configurations');
  }

  /**
   * Generate a random 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Format phone number to include country code (91)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any + or spaces
    let cleaned = phoneNumber.replace(/[\s+]/g, '');
    
    // If it doesn't start with 91, add it
    if (!cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Check if phone number should use static OTP (only 9003388830)
   */
  private shouldUseStaticOtp(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/[\s+]/g, '');
    return cleaned.endsWith(AuthService.STATIC_MOBILE) || 
           cleaned === AuthService.STATIC_MOBILE ||
           cleaned === '91' + AuthService.STATIC_MOBILE;
  }

  /**
   * Send OTP via MSG91 SMS - Using Flow API (more reliable)
   */
  private async sendOtpViaSms(phoneNumber: string, otp: string): Promise<void> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const otpExpiry = 10; // minutes

    this.logger.log(`📤 Sending OTP ${otp} to ${formattedPhone} via MSG91`);

    // Use Flow API instead of OTP API (more reliable)
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
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers,
          timeout: 15000, // 15 seconds timeout
          httpsAgent: new (require('https').Agent)({  
            rejectUnauthorized: false // Handle SSL issues
          })
        }).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`❌ MSG91 API Error: ${error.message}`);
            if (error.response) {
              this.logger.error(`Response status: ${error.response.status}`);
              this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
          })
        )
      );

      this.logger.log(`✅ MSG91 Response Status: ${response.status}`);
      this.logger.log(`✅ MSG91 Response: ${JSON.stringify(response.data)}`);

      // Check if response indicates success
      const responseData = response.data;
      if (response.status === 200 && responseData) {
        if (responseData.type === 'success' || responseData.message?.includes('success')) {
          this.logger.log(`✅ OTP sent successfully to ${formattedPhone}`);
          return;
        }
      }

      this.logger.warn(`⚠️ Unexpected MSG91 response: ${JSON.stringify(responseData)}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to send OTP via MSG91`);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);
      
      // Don't throw error - allow fallback to continue
      // In production, you might want to throw here
      throw new BadRequestException(
        'Failed to send OTP. Please try again or contact support.'
      );
    }
  }

  /**
   * Send OTP to phone number
   */
  async sendOtp(loginDto: LoginDto) {
    const phoneNumber = loginDto.phoneNumber;
    let otp: string;
    
    // Check if this is the static OTP number
    if (this.shouldUseStaticOtp(phoneNumber)) {
      otp = AuthService.STATIC_OTP;
      this.logger.log(`🔒 Using static OTP for ${phoneNumber}: ${otp}`);
    } else {
      // Generate random OTP for other numbers
      otp = this.generateOtp();
      this.logger.log(`🎲 Generated OTP for ${phoneNumber}: ${otp}`);
      
      // Send real SMS via MSG91
      try {
        await this.sendOtpViaSms(phoneNumber, otp);
      } catch (error) {
        this.logger.error(`Failed to send SMS: ${error.message}`);
        throw new BadRequestException(
          'Failed to send OTP SMS. Please try again later.'
        );
      }
    }

    // Store OTP with 5 minutes expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.otpStore.set(phoneNumber, { otp, expiresAt });

    return {
      message: 'OTP sent successfully',
      data: { 
        phoneNumber,
        // Only log OTP in development for debugging
        ...(process.env.NODE_ENV !== 'production' && { otp })
      },
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