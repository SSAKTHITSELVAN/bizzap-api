
// src/modules/auth/dto/login.dto.ts - Updated with Swagger decorators
import { IsPhoneNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Indian phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phoneNumber: string;
}

//#####################################################

// src/modules/auth/dto/register.dto.ts
import { IsString, IsNotEmpty, IsPhoneNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Indian phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;

  @ApiProperty({
    description: 'Company GST number',
    example: '22AAAAA0000A1Z5',
  })
  @IsString()
  @IsNotEmpty()
  gstNumber: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Tech Solutions Pvt Ltd',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;
  
  @ApiProperty({
    description: 'Name of the user registering the company',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({
    description: 'URL to the user\'s profile photo',
    example: 'https://example.com/user.jpg',
  })
  @IsString()
  @IsNotEmpty()
  userPhoto: string;

  @ApiProperty({
    description: 'Company logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsNotEmpty()
  logo: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Business Street, Tech City, State 123456',
    required: false,
  })
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Company description',
    example: 'Leading provider of technology solutions',
    required: false,
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Referral code provided by a referrer',
    example: 'BIZAP1234',
    required: false,
  })
  @IsString()
  referredBy?: string;
}

//#####################################################

// src/modules/auth/dto/verify-otp.dto.ts - Updated with Swagger decorators
import { IsPhoneNumber, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Indian phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

//#####################################################

// src/modules/auth/auth.controller.ts - Updated with Swagger decorators
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Register new company' })
  @ApiResponse({ status: 201, description: 'Company registered successfully' })
  @ApiResponse({ status: 400, description: 'Registration failed - invalid data or duplicate entry' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}

//#####################################################

// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CompanyModule } from '../company/company.module';
import { JwtStrategy } from '../core/strategies/jwt.strategy';

@Module({
  imports: [CompanyModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}


//#####################################################

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

  constructor(
    private jwtService: JwtService,
    private companyService: CompanyService,
  ) {}

  async sendOtp(loginDto: LoginDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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

//#####################################################


// src/modules/company/dto/create-company.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({
    description: 'Indian phone number',
    example: '+919876543210',
  })
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'Company GST number',
    example: '22AAAAA0000A1Z5',
  })
  @IsString()
  @IsNotEmpty()
  gstNumber: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Tech Solutions Pvt Ltd',
  })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({
    description: 'Company logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Business Street, Tech City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Company description',
    example: 'Leading provider of technology solutions',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
  
  @ApiProperty({
    description: 'Company business category',
    example: 'IT Services',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Referral code provided by a referrer',
    example: 'BIZAP1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiProperty({
    description: 'Referral code provided by a referrer (alias)',
    example: 'BIZAP1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  referredBy?: string;

  @ApiProperty({
    description: 'Name of the user registering the company',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({
    description: 'URL to the user\'s profile photo',
    example: 'https://example.com/user.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  userPhoto?: string;

  @ApiProperty({
    description: 'URL to the company\'s cover image',
    example: 'https://example.com/cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({
    description: 'Company registered address',
    example: '123 Corporate Ave, City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  registeredAddress?: string;
  
  @ApiProperty({
    description: 'Brief description about the company',
    example: 'We are a leading tech company specializing in AI solutions.',
    required: false,
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiProperty({
    description: 'Company operational address',
    example: '456 Tech Park, City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  operationalAddress?: string;
}

//#####################################################


// src/modules/company/dto/update-company.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto } from './create-company.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiProperty({
    description: 'Company logo URL',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    description: 'Company address',
    example: '123 Business Street, Tech City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Company description',
    example: 'Leading provider of technology solutions',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Company business category',
    example: 'Fintech',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Name of the user',
    example: 'Jane Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({
    description: 'URL to the user\'s profile photo',
    example: 'https://example.com/user-new.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  userPhoto?: string;

  @ApiProperty({
    description: 'URL to the company\'s cover image',
    example: 'https://example.com/cover-new.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({
    description: 'Company registered address',
    example: '789 Industrial Drive, City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  registeredAddress?: string;
  
  @ApiProperty({
    description: 'Brief description about the company',
    example: 'We have updated our services to include cloud computing.',
    required: false,
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiProperty({
    description: 'Company operational address',
    example: '101 Tech Plaza, City, State 123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  operationalAddress?: string;
}

//#####################################################


// src/modules/company/admin.company.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Admin-Companies')
@Controller('admin/companies')
export class AdminCompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company (admin only)' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return {
      message: 'Company created successfully',
      data: await this.companyService.create(createCompanyDto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies (admin only)' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  async findAll() {
    return {
      message: 'Companies retrieved successfully',
      data: await this.companyService.findAll(),
    };
  }

  @Get('metrics/active-users')
  @ApiOperation({ summary: 'Get active user metrics (DAU, WAU, MAU)' })
  @ApiResponse({ status: 200, description: 'Active user metrics retrieved successfully' })
  async getActiveUserMetrics() {
    const dau = await this.companyService.getDailyActiveUsers();
    const wau = await this.companyService.getWeeklyActiveUsers();
    const mau = await this.companyService.getMonthlyActiveUsers();
    return {
      message: 'Active user metrics retrieved successfully',
      data: {
        dailyActiveUsers: dau,
        weeklyActiveUsers: wau,
        monthlyActiveUsers: mau,
      },
    };
  }
  
  @Get('metrics/company-breakdown')
  @ApiOperation({ summary: 'Get various company metrics' })
  @ApiResponse({ status: 200, description: 'Company metrics retrieved successfully' })
  async getCompanyMetrics() {
    const totalCompanies = await this.companyService.getTotalRegisteredCompanies();
    const newSignups = await this.companyService.getNewSignupsPerMonth();
    const profileCompletion = await this.companyService.getProfileCompletionPercentage();
    const categoryBreakdown = await this.companyService.getCompaniesByCategory();

    return {
      message: 'Company metrics retrieved successfully',
      data: {
        totalRegisteredCompanies: totalCompanies,
        newSignupsPerMonth: newSignups,
        profileCompletionPercentage: profileCompletion,
        categoryBreakdown: categoryBreakdown,
      },
    };
  }
  
  @Get(':id/profile-completion')
  @ApiOperation({ summary: 'Get profile completion percentage for a specific company by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Profile completion percentage retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyProfileCompletion(@Param('id') id: string) {
    const completionPercentage = await this.companyService.getCompanyProfileCompletion(id);
    return {
      message: 'Profile completion percentage retrieved successfully',
      data: {
        companyId: id,
        completionPercentage: completionPercentage,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific company by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    return {
      message: 'Company retrieved successfully',
      data: await this.companyService.findOne(id),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company updated successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return {
      message: 'Company updated successfully',
      data: await this.companyService.update(id, updateCompanyDto),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company (admin only)' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company deleted successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async remove(@Param('id') id: string) {
    await this.companyService.remove(id);
    return {
      message: 'Company deleted successfully',
      data: null,
    };
  }
}

//#####################################################


// src/modules/company/company.controller.ts - Updated with Swagger decorators
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get authenticated company profile' })
  @ApiResponse({ status: 200, description: 'Company profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getProfile(@Request() req) {
    return {
      message: 'Company profile retrieved successfully',
      data: await this.companyService.findOne(req.user.companyId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    return {
      message: 'Company retrieved successfully',
      data: await this.companyService.findOne(id),
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update authenticated company profile' })
  @ApiResponse({ status: 200, description: 'Company profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async updateProfile(@Request() req, @Body() updateCompanyDto: UpdateCompanyDto) {
    return {
      message: 'Company profile updated successfully',
      data: await this.companyService.update(req.user.companyId, updateCompanyDto),
    };
  }
}

//#####################################################

// src/modules/company/company.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { AdminCompanyController } from './admin.company.controller';
import { Company } from './entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  controllers: [CompanyController, AdminCompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}

// src/modules/auth/dto/login.dto.ts
import { IsPhoneNumber, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phoneNumber: string;
}


//#####################################################


// src/modules/company/company.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Check if GST already exists
    const existingGst = await this.companyRepository.findOne({
      where: { gstNumber: createCompanyDto.gstNumber, isDeleted: false },
    });
    if (existingGst) {
      throw new BadRequestException('GST number already registered');
    }

    // Check if phone number already exists
    const existingPhone = await this.companyRepository.findOne({
      where: { phoneNumber: createCompanyDto.phoneNumber, isDeleted: false },
    });
    if (existingPhone) {
      throw new BadRequestException('Phone number already registered');
    }

    const referralCode = this.generateReferralCode();
    let leadQuota = 10;

    // Handle referral bonus
    if (createCompanyDto.referralCode) {
      const referrer = await this.companyRepository.findOne({ where: { referralCode: createCompanyDto.referralCode } });
      if (referrer) {
        leadQuota += 5;
      }
    }

    const company = this.companyRepository.create({
      ...createCompanyDto,
      referralCode,
      leadQuota,
    });
    return this.companyRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      where: { isDeleted: false },
      relations: ['leads', 'products', 'followers'],
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['leads', 'products', 'followers', 'following'],
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async findByPhone(phoneNumber: string): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { phoneNumber, isDeleted: false },
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }
  
  async updateLastLoginDate(companyId: string): Promise<void> {
    await this.companyRepository.update(companyId, { lastLoginDate: new Date() });
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepository.update(id, { isDeleted: true });
  }

  async consumeLead(companyId: string): Promise<boolean> {
    const company = await this.findOne(companyId);
    if (company.consumedLeads >= company.leadQuota) {
      return false;
    }
    
    await this.companyRepository.update(companyId, {
      consumedLeads: company.consumedLeads + 1,
    });
    return true;
  }

  private generateReferralCode(): string {
    return uuidv4().substring(0, 8).toUpperCase();
  }

  async getDailyActiveUsers(): Promise<number> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return this.companyRepository.count({
      where: {
        lastLoginDate: Between(yesterday, today),
      },
    });
  }

  async getWeeklyActiveUsers(): Promise<number> {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    return this.companyRepository.count({
      where: {
        lastLoginDate: Between(lastWeek, today),
      },
    });
  }

  async getMonthlyActiveUsers(): Promise<number> {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    return this.companyRepository.count({
      where: {
        lastLoginDate: Between(lastMonth, today),
      },
    });
  }
  
  async getCompaniesByCategory(): Promise<any[]> {
    return this.companyRepository
      .createQueryBuilder('company')
      .select('company.category as category')
      .addSelect('COUNT(*) as count')
      .where('company.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('company.category IS NOT NULL')
      .groupBy('category')
      .orderBy('count', 'DESC')
      .getRawMany();
  }
  
  async getTotalRegisteredCompanies(): Promise<number> {
    return this.companyRepository.count({ where: { isDeleted: false } });
  }

  async getNewSignupsPerMonth(): Promise<any[]> {
    return this.companyRepository
      .createQueryBuilder('company')
      .select("TO_CHAR(company.createdAt, 'YYYY-MM') as month")
      .addSelect('COUNT(*)', 'count')
      .where('company.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();
  }

  async getProfileCompletionPercentage(): Promise<number> {
    const totalCompanies = await this.companyRepository.count({ where: { isDeleted: false } });
    if (totalCompanies === 0) {
      return 0;
    }

    const companies = await this.companyRepository.find({
      where: { isDeleted: false },
      select: [
        'companyName',
        'logo',
        'address',
        'description',
        'category',
        'userName',
        'userPhoto',
        'coverImage',
        'registeredAddress',
        'about',
        'operationalAddress',
      ],
    });

    let completedProfiles = 0;
    const profileFields = [
      'companyName',
      'logo',
      'address',
      'description',
      'category',
      'userName',
      'userPhoto',
      'coverImage',
      'registeredAddress',
      'about',
      'operationalAddress',
    ];

    companies.forEach((company) => {
      let filledFields = 0;
      profileFields.forEach((field) => {
        if (company[field]) {
          filledFields++;
        }
      });
      // Assuming a profile is "complete" if more than 50% of the key fields are filled.
      // This threshold can be adjusted based on business logic.
      if (filledFields / profileFields.length >= 0.5) { 
        completedProfiles++;
      }
    });

    return (completedProfiles / totalCompanies) * 100;
  }
  
  async getCompanyProfileCompletion(id: string): Promise<number> {
    const company = await this.companyRepository.findOne({
      where: { id, isDeleted: false },
      select: [
        'companyName',
        'logo',
        'address',
        'description',
        'category',
        'userName',
        'userPhoto',
        'coverImage',
        'registeredAddress',
        'about',
        'operationalAddress',
      ],
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const profileFields = [
      'companyName',
      'logo',
      'address',
      'description',
      'category',
      'userName',
      'userPhoto',
      'coverImage',
      'registeredAddress',
      'about',
      'operationalAddress',
    ];

    let filledFields = 0;
    profileFields.forEach((field) => {
      if (company[field]) {
        filledFields++;
      }
    });

    return (filledFields / profileFields.length) * 100;
  }
}

//#####################################################

// src/core/guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }
    
    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}


//#####################################################

// src/core/interceptors/response.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
  errors: any;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    
    return next.handle().pipe(
      map(data => ({
        statusCode: response.statusCode,
        status: 'success',
        message: data?.message || 'Operation successful',
        data: data?.data || data,
        errors: null,
      })),
    );
  }
}


//#####################################################

// src/core/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'bizzap-secret-key',
    });
  }

  async validate(payload: any) {
    return { 
      companyId: payload.companyId, 
      phoneNumber: payload.phoneNumber 
    };
  }
}

//#####################################################

// src/database/typeorm.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';
import { Follower } from '../followers/entities/follower.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port:  5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '0.00',
  database: process.env.DATABASE_NAME || 'bizzap_db',
  entities: [Company, Lead, Product, Follower],
  synchronize: true,
  logging: false,
};


//#####################################################

// src/modules/followers/dto/follow.dto.ts - Updated with Swagger decorators
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FollowDto {
  @ApiProperty({
    description: 'UUID of the company to follow',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  companyId: string;
}

//#####################################################

// src/modules/followers/entities/follower.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Unique } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('followers')
@Unique(['followerCompanyId', 'followedCompanyId'])
export class Follower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  followerCompanyId: string;

  @Column()
  followedCompanyId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Company, (company) => company.following)
  followerCompany: Company;

  @ManyToOne(() => Company, (company) => company.followers)
  followedCompany: Company;
}

//#####################################################

// src/modules/followers/followers.controller.ts - Updated with Swagger decorators
import { Controller, Post, Delete, Get, Param, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FollowersService } from './followers.service';
import { FollowDto } from './dto/follow.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Followers')
@Controller('followers')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Post('follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Follow a company' })
  @ApiResponse({ status: 201, description: 'Company followed successfully' })
  @ApiResponse({ status: 400, description: 'Already following or cannot follow yourself' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async follow(@Request() req, @Body() followDto: FollowDto) {
    return {
      message: 'Company followed successfully',
      data: await this.followersService.follow(req.user.companyId, followDto.companyId),
    };
  }

  @Delete('unfollow/:companyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unfollow a company' })
  @ApiParam({ name: 'companyId', description: 'Company UUID to unfollow' })
  @ApiResponse({ status: 200, description: 'Company unfollowed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 404, description: 'Not following this company' })
  async unfollow(@Request() req, @Param('companyId') companyId: string) {
    await this.followersService.unfollow(req.user.companyId, companyId);
    return {
      message: 'Company unfollowed successfully',
      data: null,
    };
  }

  @Get('following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get companies that authenticated company is following' })
  @ApiResponse({ status: 200, description: 'Following companies retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getFollowing(@Request() req) {
    return {
      message: 'Following companies retrieved successfully',
      data: await this.followersService.getFollowing(req.user.companyId),
    };
  }

  @Get('followers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get followers of authenticated company' })
  @ApiResponse({ status: 200, description: 'Followers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getFollowers(@Request() req) {
    return {
      message: 'Followers retrieved successfully',
      data: await this.followersService.getFollowers(req.user.companyId),
    };
  }

  @Get('check/:companyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check if authenticated company is following another company' })
  @ApiParam({ name: 'companyId', description: 'Company UUID to check' })
  @ApiResponse({ status: 200, description: 'Follow status retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async checkFollowing(@Request() req, @Param('companyId') companyId: string) {
    return {
      message: 'Follow status retrieved successfully',
      data: {
        isFollowing: await this.followersService.isFollowing(req.user.companyId, companyId),
      },
    };
  }
}

//#####################################################

// src/modules/followers/followers.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follower } from './entities/follower.entity';
import { Company } from '../company/entities/company.entity';

@Injectable()
export class FollowersService {
  constructor(
    @InjectRepository(Follower)
    private followerRepository: Repository<Follower>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async follow(followerCompanyId: string, followedCompanyId: string): Promise<Follower> {
    if (followerCompanyId === followedCompanyId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if already following
    const existingFollow = await this.followerRepository.findOne({
      where: { followerCompanyId, followedCompanyId },
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this company');
    }

    // Check if followed company exists
    const followedCompany = await this.companyRepository.findOne({
      where: { id: followedCompanyId, isDeleted: false },
    });

    if (!followedCompany) {
      throw new NotFoundException('Company to follow not found');
    }

    const follow = this.followerRepository.create({
      followerCompanyId,
      followedCompanyId,
    });

    const savedFollow = await this.followerRepository.save(follow);

    // Update followers count
    await this.companyRepository.update(followedCompanyId, {
      followersCount: followedCompany.followersCount + 1,
    });

    return savedFollow;
  }

  async unfollow(followerCompanyId: string, followedCompanyId: string): Promise<void> {
    const follow = await this.followerRepository.findOne({
      where: { followerCompanyId, followedCompanyId },
    });

    if (!follow) {
      throw new NotFoundException('Not following this company');
    }

    await this.followerRepository.remove(follow);

    // Update followers count
    const followedCompany = await this.companyRepository.findOne({
      where: { id: followedCompanyId, isDeleted: false },
    });

    if (followedCompany) {
      await this.companyRepository.update(followedCompanyId, {
        followersCount: Math.max(0, followedCompany.followersCount - 1),
      });
    }
  }

  async getFollowing(companyId: string): Promise<Company[]> {
    const follows = await this.followerRepository.find({
      where: { followerCompanyId: companyId },
      relations: ['followedCompany'],
    });

    return follows.map(follow => follow.followedCompany);
  }

  async getFollowers(companyId: string): Promise<Company[]> {
    const follows = await this.followerRepository.find({
      where: { followedCompanyId: companyId },
      relations: ['followerCompany'],
    });

    return follows.map(follow => follow.followerCompany);
  }

  async isFollowing(followerCompanyId: string, followedCompanyId: string): Promise<boolean> {
    const follow = await this.followerRepository.findOne({
      where: { followerCompanyId, followedCompanyId },
    });

    return !!follow;
  }
}


//#####################################################

// src/modules/followers/followers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowersService } from './followers.service';
import { FollowersController } from './followers.controller';
import { Follower } from './entities/follower.entity';
import { Company } from '../company/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Follower, Company])],
  controllers: [FollowersController],
  providers: [FollowersService],
  exports: [FollowersService],
})
export class FollowersModule {}

//#####################################################

// src/modules/leads/dto/create-lead.dto.ts - Updated with Swagger decorators
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty({
    description: 'Lead title',
    example: 'Looking for Web Development Services',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the lead requirement',
    example: 'We need a professional website for our startup with modern design and mobile responsiveness.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Optional image URL for the lead',
    example: 'https://example.com/lead-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Budget for the lead (e.g., $5000)',
    required: false,
  })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiProperty({
    description: 'Quantity required (e.g., 50 units)',
    required: false,
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiProperty({
    description: 'Location of the lead (e.g., San Francisco)',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;
}

//#####################################################

// src/modules/leads/dto/deactivate-lead.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeactivateLeadDto {
  @ApiProperty({
    description: 'Reason for deactivating the lead',
    example: 'Lead requirement fulfilled',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reasonForDeactivation?: string;
}

//#####################################################

// src/modules/leads/dto/update-lead.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadDto } from './create-lead.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiProperty({
    description: 'Lead title',
    example: 'Updated Lead Title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Detailed description of the lead requirement',
    example: 'Updated description for the lead.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Optional image URL for the lead',
    example: 'https://example.com/updated-lead-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Budget for the lead',
    required: false,
  })
  @IsOptional()
  @IsString()
  budget?: string;

  @ApiProperty({
    description: 'Quantity required',
    required: false,
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiProperty({
    description: 'Location of the lead',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Reason for deactivating the lead',
    example: 'Lead requirement fulfilled',
    required: false,
  })
  @IsOptional()
  @IsString()
  reasonForDeactivation?: string;
}

//#####################################################

// src/modules/leads/entities/lead.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  budget: string;

  @Column({ nullable: true })
  quantity: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  reasonForDeactivation?: string;

  @Column({ default: 0 })
  consumedCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.leads)
  company: Company;

  @Column()
  companyId: string;
}

//#####################################################


//################################################################################
// Leads with reason
//################################################################################


// src/modules/leads/admin.leads.controller.ts
import { Controller, Get, Param, Delete } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Admin-Leads')
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('metrics/daily')
  @ApiOperation({ summary: 'Get lead creation count per day (admin only)' })
  @ApiResponse({ status: 200, description: 'Daily lead count retrieved successfully' })
  async getDailyLeadMetrics() {
    return {
      message: 'Daily lead count retrieved successfully',
      data: await this.leadsService.getLeadCountByDate(),
    };
  }

  @Get('metrics/monthly')
  @ApiOperation({ summary: 'Get lead creation count per month (admin only)' })
  @ApiResponse({ status: 200, description: 'Monthly lead count retrieved successfully' })
  async getMonthlyLeadMetrics() {
    return {
      message: 'Monthly lead count retrieved successfully',
      data: await this.leadsService.getLeadCountByMonth(),
    };
  }

  @Get('metrics/total')
  @ApiOperation({ summary: 'Get total lead counts (admin only)' })
  @ApiResponse({ status: 200, description: 'Total lead counts retrieved successfully' })
  async getTotalLeadMetrics() {
    const totalLeads = await this.leadsService.getTotalLeadCount();
    const totalActiveLeads = await this.leadsService.getTotalActiveLeads();
    const totalConsumedLeads = await this.leadsService.getTotalConsumedLeads();
    return {
      message: 'Total lead metrics retrieved successfully',
      data: {
        totalLeads,
        totalActiveLeads,
        totalConsumedLeads,
      },
    };
  }
  
  @Get('metrics/conversion-rate')
  @ApiOperation({ summary: 'Get lead conversion rate (admin only)' })
  @ApiResponse({ status: 200, description: 'Lead conversion rate retrieved successfully' })
  async getLeadConversionRate() {
    return {
      message: 'Lead conversion rate retrieved successfully',
      data: await this.leadsService.getLeadConversionRate(),
    };
  }

  @Get('metrics/avg-consumptions')
  @ApiOperation({ summary: 'Get average consumptions per company (admin only)' })
  @ApiResponse({ status: 200, description: 'Average consumptions per company retrieved successfully' })
  async getAverageConsumptions() {
    return {
      message: 'Average consumptions per company retrieved successfully',
      data: {
        averageConsumptions: await this.leadsService.getAverageConsumptionsPerCompany(),
      },
    };
  }

  @Get('metrics/supply-demand')
  @ApiOperation({ summary: 'Get lead supply vs. demand ratio (admin only)' })
  @ApiResponse({ status: 200, description: 'Lead supply-demand ratio retrieved successfully' })
  async getSupplyDemandRatio() {
    return {
      message: 'Lead supply-demand ratio retrieved successfully',
      data: await this.leadsService.getLeadSupplyDemandRatio(),
    };
  }
  
  @Get('metrics/locations')
  @ApiOperation({ summary: 'Get most popular lead locations (admin only)' })
  @ApiResponse({ status: 200, description: 'Top lead locations retrieved successfully' })
  async getLeadsByLocation() {
    return {
      message: 'Top lead locations retrieved successfully',
      data: await this.leadsService.getTopLeadLocations(),
    };
  }
  
  @Get('metrics/churn-rate')
  @ApiOperation({ summary: 'Get lead churn rate (leads with 0 views/consumptions) (admin only)' })
  @ApiResponse({ status: 200, description: 'Lead churn rate retrieved successfully' })
  async getLeadChurnRate() {
    return {
      message: 'Lead churn rate retrieved successfully',
      data: await this.leadsService.getLeadChurnRate(),
    };
  }

  @Get('metrics/consumed')
  @ApiOperation({ summary: 'Get a list of most consumed leads (admin only)' })
  @ApiResponse({ status: 200, description: 'Most consumed leads retrieved successfully' })
  async getMostConsumedLeads() {
    return {
      message: 'Most consumed leads retrieved successfully',
      data: await this.leadsService.getMostConsumedLeads(),
    };
  }

  @Get('metrics/viewed')
  @ApiOperation({ summary: 'Get a list of most viewed leads (admin only)' })
  @ApiResponse({ status: 200, description: 'Most viewed leads retrieved successfully' })
  async getMostViewedLeads() {
    return {
      message: 'Most viewed leads retrieved successfully',
      data: await this.leadsService.getMostViewedLeads(),
    };
  }

  @Get('metrics/lifespan')
  @ApiOperation({ summary: 'Get average lead lifespan in days (admin only)' })
  @ApiResponse({ status: 200, description: 'Average lead lifespan retrieved successfully' })
  async getAverageLeadLifespan() {
    const lifespanInDays = await this.leadsService.getAverageLeadLifespan();
    return {
      message: 'Average lead lifespan retrieved successfully',
      data: {
        averageLifespanInDays: lifespanInDays,
      },
    };
  }
  
  @Get('status/all-deactivated')
  @ApiOperation({ summary: 'Get all deactivated leads (both inactive and deleted) (admin only)' })
  @ApiResponse({ status: 200, description: 'All deactivated leads retrieved successfully' })
  async getAllDeactivatedLeads() {
    return {
      message: 'All deactivated leads retrieved successfully',
      data: await this.leadsService.getAllDeactivatedLeads(),
    };
  }

  @Get('status/inactive')
  @ApiOperation({ summary: 'Get inactive leads with their deactivation reasons (admin only)' })
  @ApiResponse({ status: 200, description: 'Inactive leads retrieved successfully' })
  async getInactiveLeads() {
    return {
      message: 'Inactive leads retrieved successfully',
      data: await this.leadsService.getInactiveLeads(),
    };
  }

  @Get('status/deleted')
  @ApiOperation({ summary: 'Get all deleted leads (admin only)' })
  @ApiResponse({ status: 200, description: 'Deleted leads retrieved successfully' })
  async getDeletedLeads() {
    return {
      message: 'Deleted leads retrieved successfully',
      data: await this.leadsService.getDeletedLeads(),
    };
  }

  @Get('status/inactive/by-reason')
  @ApiOperation({ summary: 'Get inactive leads grouped by deactivation reason (admin only)' })
  @ApiResponse({ status: 200, description: 'Inactive leads grouped by reason retrieved successfully' })
  async getInactiveLeadsByReason() {
    return {
      message: 'Inactive leads grouped by reason retrieved successfully',
      data: await this.leadsService.getInactiveLeadsByReason(),
    };
  }
  
  @Get(':companyId/metrics/leads-summary')
  @ApiOperation({ summary: 'Get lead metrics for a specific company (admin only)' })
  @ApiParam({ name: 'companyId', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company-specific lead metrics retrieved successfully' })
  async getCompanyLeadMetrics(@Param('companyId') companyId: string) {
    const totalLeads = await this.leadsService.getCompanyTotalLeadsPosted(companyId);
    const activeLeads = await this.leadsService.getCompanyActiveLeads(companyId);
    const consumedLeads = await this.leadsService.getCompanyConsumedLeads(companyId);
    const availabilityRatio = await this.leadsService.getCompanyLeadAvailabilityRatio(companyId);

    return {
      message: `Lead metrics for company ${companyId} retrieved successfully`,
      data: {
        totalLeadsPosted: totalLeads,
        totalActiveLeads: activeLeads,
        totalConsumedLeads: consumedLeads,
        leadAvailabilityRatio: availabilityRatio,
      },
    };
  }
  
  // Standard CRUD endpoints
  @Get()
  async findAll() {
    return {
      message: 'All leads retrieved successfully',
      data: await this.leadsService.findAll(),
    };
  }
  
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      message: 'Lead retrieved successfully',
      data: await this.leadsService.findOne(id),
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    // Admin can delete any lead - pass empty companyId to bypass ownership check
    await this.leadsService.remove(id, '');
    return {
      message: 'Lead deleted successfully',
      data: null,
    };
  }
}

//#####################################################

// src/modules/leads/leads.controller.ts - Final Version
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { DeactivateLeadDto } from './dto/deactivate-lead.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async create(@Request() req, @Body() createLeadDto: CreateLeadDto) {
    return {
      message: 'Lead created successfully',
      data: await this.leadsService.create(req.user.companyId, createLeadDto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all active leads' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  async findAll() {
    return {
      message: 'Leads retrieved successfully',
      data: await this.leadsService.findAll(),
    };
  }

  @Get('my-leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get authenticated company leads' })
  @ApiResponse({ status: 200, description: 'My leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async findMyLeads(@Request() req) {
    return {
      message: 'My leads retrieved successfully',
      data: await this.leadsService.findByCompany(req.user.companyId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findOne(@Param('id') id: string) {
    return {
      message: 'Lead retrieved successfully',
      data: await this.leadsService.findOne(id),
    };
  }

  @Post(':id/consume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Consume a lead to get contact information' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead consumed successfully or insufficient quota' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Cannot consume your own lead' })
  async consumeLead(@Param('id') id: string, @Request() req) {
    const result = await this.leadsService.consumeLead(id, req.user.companyId);
    return {
      message: result.success ? 'Lead consumed successfully' : 'Insufficient lead quota',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Can only update your own leads' })
  async update(@Param('id') id: string, @Request() req, @Body() updateLeadDto: UpdateLeadDto) {
    return {
      message: 'Lead updated successfully',
      data: await this.leadsService.update(id, req.user.companyId, updateLeadDto),
    };
  }

  @Patch(':id/status/:isActive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle the active status of a lead' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiParam({ name: 'isActive', description: 'Boolean status (true for active, false for inactive)' })
  @ApiResponse({ status: 200, description: 'Lead status updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async toggleActiveStatus(@Param('id') id: string, @Param('isActive') isActive: string, @Request() req) {
    const status = isActive.toLowerCase() === 'true';
    const lead = await this.leadsService.toggleActiveStatus(id, req.user.companyId, status);
    return {
      message: `Lead has been ${status ? 'activated' : 'deactivated'}`,
      data: lead,
    };
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Deactivate a lead with reason' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deactivateLead(@Param('id') id: string, @Request() req, @Body() deactivateLeadDto: DeactivateLeadDto) {
    const lead = await this.leadsService.deactivateLeadWithReason(id, req.user.companyId, deactivateLeadDto.reasonForDeactivation);
    return {
      message: 'Lead has been deactivated',
      data: lead,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a lead' })
  @ApiParam({ name: 'id', description: 'Lead UUID' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Can only delete your own leads' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.leadsService.remove(id, req.user.companyId);
    return {
      message: 'Lead deleted successfully',
      data: null,
    };
  }
}

//#####################################################


// src/modules/leads/leads.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AdminLeadsController } from './admin.leads.controller';
import { Lead } from './entities/lead.entity';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead]), CompanyModule],
  controllers: [LeadsController, AdminLeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}

//#####################################################



//#################################################################
// Leads with reason
//#################################################################

// src/modules/leads/leads.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CompanyService } from '../company/company.service';
import { Company } from '../company/entities/company.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    private companyService: CompanyService,
  ) {}

  async create(companyId: string, createLeadDto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadRepository.create({
      ...createLeadDto,
      companyId,
    });
    return this.leadRepository.save(lead);
  }

  async findAll(): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: false, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCompany(companyId: string): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    // Increment view count when a lead is viewed
    lead.viewCount += 1;
    await this.leadRepository.save(lead);
    return lead;
  }

  async update(id: string, companyId: string, updateLeadDto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOne(id);
    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }
    Object.assign(lead, updateLeadDto);
    return this.leadRepository.save(lead);
  }

  async toggleActiveStatus(id: string, companyId: string, isActive: boolean): Promise<Lead> {
    const lead = await this.findOne(id);
    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }
    lead.isActive = isActive;
    
    // Clear reason for deactivation when reactivating
    if (isActive) {
      lead.reasonForDeactivation = undefined;
    }
    
    return this.leadRepository.save(lead);
  }

  async deactivateLeadWithReason(id: string, companyId: string, reason?: string): Promise<Lead> {
    const lead = await this.findOne(id);
    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own leads');
    }
    
    lead.isActive = false;
    lead.reasonForDeactivation = reason;
    
    return this.leadRepository.save(lead);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const lead = await this.findOne(id);
    if (lead.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own leads');
    }
    await this.leadRepository.update(id, { isDeleted: true });
  }

  async consumeLead(leadId: string, consumerCompanyId: string): Promise<{ success: boolean; contact?: string }> {
    const lead = await this.findOne(leadId);

    if (lead.companyId === consumerCompanyId) {
      throw new ForbiddenException('Cannot consume your own lead');
    }

    const canConsume = await this.companyService.consumeLead(consumerCompanyId);
    if (!canConsume) {
      return { success: false };
    }

    await this.leadRepository.update(leadId, {
      consumedCount: lead.consumedCount + 1,
    });

    return {
      success: true,
      contact: lead.company.phoneNumber,
    };
  }
  
  // Enhanced methods for admin to view special leads
  async getAllDeactivatedLeads(): Promise<{inactive: Lead[], deleted: Lead[]}> {
    const inactiveLeads = await this.getInactiveLeads();
    const deletedLeads = await this.getDeletedLeads();
    
    return {
      inactive: inactiveLeads,
      deleted: deletedLeads,
    };
  }

  async getInactiveLeads(): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: false, isActive: false },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getDeletedLeads(): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: true },
      relations: ['company'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getInactiveLeadsByReason(): Promise<any[]> {
    return this.leadRepository
      .createQueryBuilder('lead')
      .select([
        'COALESCE(lead.reasonForDeactivation, \'No reason provided\') as reason',
        'COUNT(*) as count',
        'ARRAY_AGG(lead.id) as leadIds'
      ])
      .where('lead.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('lead.isActive = :isActive', { isActive: false })
      .groupBy('lead.reasonForDeactivation')
      .orderBy('count', 'DESC')
      .getRawMany();
  }

  // Legacy methods (keeping for backward compatibility)
  async getDeactivatedLeads(): Promise<Lead[]> {
    return this.getInactiveLeads();
  }

  async getDeactivatedLeadsByReason(): Promise<any[]> {
    return this.getInactiveLeadsByReason();
  }
  
  // Existing Admin Metrics Methods
  async getLeadCountByDate(): Promise<any[]> {
    return this.leadRepository
      .createQueryBuilder('lead')
      .select("DATE(lead.createdAt) as date")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("date")
      .orderBy("date", "DESC")
      .getRawMany();
  }

  async getLeadCountByMonth(): Promise<any[]> {
    return this.leadRepository
      .createQueryBuilder('lead')
      .select("TO_CHAR(lead.createdAt, 'YYYY-MM') as month")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("month")
      .orderBy("month", "DESC")
      .getRawMany();
  }
  
  async getTotalLeadCount(): Promise<number> {
    return this.leadRepository.count({ where: { isDeleted: false } });
  }

  async getTotalActiveLeads(): Promise<number> {
    return this.leadRepository.count({ where: { isDeleted: false, isActive: true } });
  }
  
  async getTotalConsumedLeads(): Promise<number> {
    const result = await this.leadRepository
      .createQueryBuilder('lead')
      .select("SUM(lead.consumedCount)", "totalConsumed")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .getRawOne();
    return parseInt(result.totalConsumed, 10) || 0;
  }

  async getMostConsumedLeads(limit: number = 10): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: false },
      order: { consumedCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
  }
  
  async getMostViewedLeads(limit: number = 10): Promise<Lead[]> {
    return this.leadRepository.find({
      where: { isDeleted: false },
      order: { viewCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
  }
  
  async getLeadsByLocation(): Promise<any[]> {
    return this.leadRepository
      .createQueryBuilder('lead')
      .select("lead.location as location")
      .addSelect("COUNT(*) as count")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .andWhere("lead.location IS NOT NULL")
      .groupBy("location")
      .orderBy("count", "DESC")
      .getRawMany();
  }

  async getAverageLeadLifespan(): Promise<number> {
    const result = await this.leadRepository
      .createQueryBuilder('lead')
      .select("AVG(EXTRACT(EPOCH FROM lead.updatedAt - lead.createdAt))", "averageLifespan")
      .where("lead.isActive = :isActive", { isActive: false })
      .andWhere("lead.isDeleted = :isDeleted", { isDeleted: false })
      .getRawOne();
    
    // Convert seconds to days and return
    return result.averageLifespan ? Math.round(result.averageLifespan / 86400) : 0;
  }

  async getLeadConversionRate(): Promise<any> {
    const totalLeads = await this.leadRepository.count({ where: { isDeleted: false } });
    const consumedLeads = await this.leadRepository.count({ where: { isDeleted: false, consumedCount: In(Array.from({length: 100}, (_, i) => i + 1)) } });
    const rate = totalLeads > 0 ? (consumedLeads / totalLeads) * 100 : 0;
    return {
      totalLeads,
      consumedLeads,
      conversionRate: rate.toFixed(2) + '%',
    };
  }

  async getAverageConsumptionsPerCompany(): Promise<string> {
    const result = await this.leadRepository
      .createQueryBuilder('lead')
      .select("AVG(lead.consumedCount)", "avgConsumptions")
      .where("lead.isDeleted = :isDeleted", { isDeleted: false })
      .getRawOne();
    return result.avgConsumptions ? parseFloat(result.avgConsumptions).toFixed(2) : '0';
  }

  async getLeadSupplyDemandRatio(): Promise<any> {
    const leadsCreated = await this.getTotalLeadCount();
    const leadsConsumed = await this.getTotalConsumedLeads();
    return {
      leadsCreated,
      leadsConsumed,
      ratio: leadsConsumed > 0 ? (leadsCreated / leadsConsumed).toFixed(2) : leadsCreated.toFixed(2),
    };
  }

  async getTopLeadLocations(limit: number = 5): Promise<any[]> {
    return this.leadRepository.query(`
      SELECT location, COUNT(*) as count
      FROM leads
      WHERE "isDeleted" = false AND location IS NOT NULL
      GROUP BY location
      ORDER BY count DESC
      LIMIT ${limit};
    `);
  }

  async getLeadChurnRate(): Promise<any> {
    const totalLeads = await this.getTotalLeadCount();
    const churnedLeads = await this.leadRepository.count({
      where: {
        isDeleted: false,
        viewCount: 0,
        consumedCount: 0
      }
    });
    const rate = totalLeads > 0 ? (churnedLeads / totalLeads) * 100 : 0;
    return {
      totalLeads,
      churnedLeads,
      churnRate: rate.toFixed(2) + '%',
    };
  }
  
  // New metrics for a specific company
  async getCompanyTotalLeadsPosted(companyId: string): Promise<number> {
    return this.leadRepository.count({
      where: { companyId, isDeleted: false }
    });
  }

  async getCompanyActiveLeads(companyId: string): Promise<number> {
    return this.leadRepository.count({
      where: { companyId, isDeleted: false, isActive: true }
    });
  }

  async getCompanyConsumedLeads(companyId: string): Promise<number> {
    const result = await this.leadRepository
      .createQueryBuilder('lead')
      .select("SUM(lead.consumedCount)", "totalConsumed")
      .where("lead.companyId = :companyId", { companyId })
      .andWhere("lead.isDeleted = :isDeleted", { isDeleted: false })
      .getRawOne();
    return parseInt(result.totalConsumed, 10) || 0;
  }

  async getCompanyLeadAvailabilityRatio(companyId: string): Promise<string> {
    const totalLeads = await this.getCompanyTotalLeadsPosted(companyId);
    const activeLeads = await this.getCompanyActiveLeads(companyId);
    return totalLeads > 0 ? ((activeLeads / totalLeads) * 100).toFixed(2) + '%' : '0.00%';
  }
}

//#####################################################

// src/modules/products/dto/create-product.dto.ts - Updated with Swagger decorators
import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Professional Website Development',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Custom website development with modern design and responsive layout',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Array of product image URLs',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Product price',
    example: 25000.00,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({
    description: 'Minimum quantity for the product',
    example: 'Payment terms: 50% advance, 50% on completion',
    required: false,
  })
  @IsOptional()
  @IsString()
  minimumQuantity?: string;
}

//#####################################################

// src/modules/products/dto/update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}

//#####################################################

// src/modules/products/entities/product.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../../company/entities/company.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('text', { array: true, default: [] })
  images: string[];

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price: number;

  @Column('text', { nullable: true })
  minimumQuantity: string;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.products)
  company: Company;

  @Column()
  companyId: string;
}

//#####################################################

// src/modules/products/products.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiBearerAuth('JWT-auth')
@ApiTags('Products')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req, @Body() createProductDto: CreateProductDto): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.create(companyId, createProductDto);
  }

  @Get('company')
  findByCompany(@Req() req): Promise<Product[]> {
    const companyId = req.user.companyId;
    return this.productsService.findByCompany(companyId);
  }
  
  @Get()
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.update(id, companyId, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req, @Param('id') id: string): Promise<void> {
    const companyId = req.user.companyId;
    return this.productsService.remove(id, companyId);
  }
}

//#####################################################

// src/modules/products/products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

//#####################################################

// src/modules/products/products.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(companyId: string, createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      companyId,
    });
    return this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCompany(companyId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, companyId: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    if (product.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own products');
    }
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const product = await this.findOne(id);
    if (product.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own products');
    }
    await this.productRepository.update(id, { isDeleted: true });
  }
}


//#####################################################

// src/modules/search/search.controller.ts - Updated with Swagger decorators
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search across all entities (companies, leads, products)' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'web development' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Query too short (minimum 2 characters)' })
  async searchAll(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: { companies: [], leads: [], products: [] },
      };
    }

    return {
      message: 'Search results retrieved successfully',
      data: await this.searchService.searchAll(query.trim()),
    };
  }

  @Get('companies')
  @ApiOperation({ summary: 'Search companies' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'tech solutions' })
  @ApiResponse({ status: 200, description: 'Companies search results retrieved successfully' })
  async searchCompanies(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: [],
      };
    }

    return {
      message: 'Companies search results retrieved successfully',
      data: await this.searchService.searchCompanies(query.trim()),
    };
  }

  @Get('leads')
  @ApiOperation({ summary: 'Search leads' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'website development' })
  @ApiResponse({ status: 200, description: 'Leads search results retrieved successfully' })
  async searchLeads(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: [],
      };
    }

    return {
      message: 'Leads search results retrieved successfully',
      data: await this.searchService.searchLeads(query.trim()),
    };
  }

  @Get('products')
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'web development' })
  @ApiResponse({ status: 200, description: 'Products search results retrieved successfully' })
  async searchProducts(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: [],
      };
    }

    return {
      message: 'Products search results retrieved successfully',
      data: await this.searchService.searchProducts(query.trim()),
    };
  }
}

//#####################################################

// src/modules/search/search.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Lead, Product])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

//#####################################################


// src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async searchCompanies(query: string): Promise<Company[]> {
    return this.companyRepository.find({
      where: [
        { companyName: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
        { gstNumber: Like(`%${query}%`), isDeleted: false },
      ],
      take: 10,
    });
  }

  async searchLeads(query: string): Promise<Lead[]> {
    return this.leadRepository.find({
      where: [
        { title: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
      ],
      relations: ['company'],
      take: 20,
      order: { createdAt: 'DESC' },
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.productRepository.find({
      where: [
        { name: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
      ],
      relations: ['company'],
      take: 20,
      order: { createdAt: 'DESC' },
    });
  }

  async searchAll(query: string): Promise<{
    companies: Company[];
    leads: Lead[];
    products: Product[];
  }> {
    const [companies, leads, products] = await Promise.all([
      this.searchCompanies(query),
      this.searchLeads(query),
      this.searchProducts(query),
    ]);

    return { companies, leads, products };
  }
}

//#####################################################

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}


//#####################################################

// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { typeOrmConfig } from './database/typeorm.config';

// Modules
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { LeadsModule } from './leads/leads.module';
import { ProductsModule } from './products/products.module';
import { FollowersModule } from './followers/followers.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmConfig),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'bizzap-secret-key',
      signOptions: { expiresIn: '30d' },
    }),
    AuthModule,
    CompanyModule,
    LeadsModule,
    ProductsModule,
    FollowersModule,
    SearchModule,
  ],
})
export class AppModule {}

//#####################################################

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}


//#####################################################

// src/main.ts - Updated with Swagger configuration
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Bizzap API')
    .setDescription('Business networking platform API with leads, products, and company management')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Companies', 'Company management')
    .addTag('Leads', 'Lead management')
    .addTag('Products', 'Product management')
    .addTag('Followers', 'Company follow system')
    .addTag('Search', 'Search functionality')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  
  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
  console.log('Swagger UI is available at: http://localhost:3000/api/docs');
}
bootstrap();

//#####################################################


# .env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=0.00
DATABASE_NAME=bizzap_db

JWT_SECRET=your_super_secret_key_for_jwt
JWT_EXPIRATION_TIME=3600s

//#####################################################
