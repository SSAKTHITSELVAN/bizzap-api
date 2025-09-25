// // src/modules/auth/auth.service.ts
// import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { CompanyService } from '../company/company.service';
// import { LoginDto } from './dto/login.dto';
// import { VerifyOtpDto } from './dto/verify-otp.dto';
// import { RegisterDto } from './dto/register.dto';

// @Injectable()
// export class AuthService {
//   private otpStore = new Map<string, { otp: string; expiresAt: Date }>();

//   constructor(
//     private jwtService: JwtService,
//     private companyService: CompanyService,
//   ) {}

//   async sendOtp(loginDto: LoginDto) {
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

//     this.otpStore.set(loginDto.phoneNumber, { otp, expiresAt });

//     // In production, integrate with SMS service
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

//     // Check if company already exists
//     const company = await this.companyService.findByPhone(verifyOtpDto.phoneNumber);
    
//     if (company) {
//       // Existing user - login
//       const token = this.jwtService.sign({
//         companyId: company.id,
//         phoneNumber: company.phoneNumber,
//       });

//       return {
//         message: 'Login successful',
//         data: {
//           token,
//           company,
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

//   async register(registerDto: RegisterDto) {
//     // Verify OTP again for registration
//     const storedOtp = this.otpStore.get(registerDto.phoneNumber);
//     if (!storedOtp || storedOtp.otp !== registerDto.otp) {
//       throw new UnauthorizedException('Invalid OTP for registration');
//     }

//     const company = await this.companyService.create(registerDto);

//     const token = this.jwtService.sign({
//       companyId: company.id,
//       phoneNumber: company.phoneNumber,
//     });

//     this.otpStore.delete(registerDto.phoneNumber);

//     return {
//       message: 'Registration successful',
//       data: {
//         token,
//         company,
//       },
//     };
//   }
// }



// src/modules/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CompanyService } from '../company/company.service';
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
  ) {}

  async sendOtp(loginDto: LoginDto) {
    // Use static OTP instead of random
    const otp = AuthService.STATIC_OTP;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    this.otpStore.set(loginDto.phoneNumber, { otp, expiresAt });

    // In production, integrate with SMS service
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

    // Check if company already exists
    const company = await this.companyService.findByPhone(verifyOtpDto.phoneNumber);
    
    if (company) {
      // Existing user - login
      const token = this.jwtService.sign({
        companyId: company.id,
        phoneNumber: company.phoneNumber,
      });

      return {
        message: 'Login successful',
        data: {
          token,
          company,
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

  async register(registerDto: RegisterDto) {
    // Verify OTP again for registration
    const storedOtp = this.otpStore.get(registerDto.phoneNumber);
    if (!storedOtp || storedOtp.otp !== registerDto.otp) {
      throw new UnauthorizedException('Invalid OTP for registration');
    }

    const company = await this.companyService.create(registerDto);

    const token = this.jwtService.sign({
      companyId: company.id,
      phoneNumber: company.phoneNumber,
    });

    this.otpStore.delete(registerDto.phoneNumber);

    return {
      message: 'Registration successful',
      data: {
        token,
        company,
      },
    };
  }
}