// src/modules/auth/auth.controller.ts - UPDATED WITH FILE UPLOAD
import { 
  Controller, 
  Post, 
  Body, 
  UseInterceptors, 
  UploadedFiles,
  BadRequestException 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to phone number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid phone number' })
  @ApiBody({ type: LoginDto })
  async sendOtp(@Body() loginDto: LoginDto) {
    return this.authService.sendOtp(loginDto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and login/check registration status' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiBody({ type: VerifyOtpDto })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'userPhoto', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ])
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Register new company with file uploads',
    description: 'Upload user photo, company logo, and cover image during registration. Can also accept URLs for backward compatibility.'
  })
  @ApiResponse({ status: 201, description: 'Company registered successfully' })
  @ApiResponse({ status: 400, description: 'Registration failed - invalid data or duplicate entry' })
  @ApiBody({
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
        // File uploads
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
        // URL alternatives (backward compatibility)
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
  })
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFiles() files: { 
      userPhoto?: Express.Multer.File[], 
      logo?: Express.Multer.File[],
      coverImage?: Express.Multer.File[]
    }
  ) {
    // Validate that either file or URL is provided for required images
    const userPhotoFile = files?.userPhoto?.[0];
    const logoFile = files?.logo?.[0];
    const userPhotoUrl = registerDto.userPhoto; // From form data
    const logoUrl = registerDto.logo; // From form data

    if (!userPhotoFile && !userPhotoUrl) {
      throw new BadRequestException('Either userPhoto file or userPhotoUrl must be provided');
    }

    if (!logoFile && !logoUrl) {
      throw new BadRequestException('Either logo file or logoUrl must be provided');
    }

    // coverImage is optional, no validation needed

    return this.authService.register(registerDto, files);
  }
}