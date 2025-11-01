// src/modules/company/company.controller.ts - UPDATED WITH FILE UPLOAD
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards, 
  Request,
  UseInterceptors,
  UploadedFiles 
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PayAsYouGoDto } from './dto/pay-as-you-go.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';
import { RazorpayService, SubscriptionPlan } from './razorpay.service';

@ApiTags('Companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly razorpayService: RazorpayService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get authenticated company profile' })
  @ApiResponse({ status: 200, description: 'Company profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getProfile(@Request() req) {
    const company = await this.companyService.findOne(req.user.companyId);
    const subscription = await this.companyService.getActiveSubscription(req.user.companyId);
    
    // Generate signed URLs for S3 assets
    const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);
    
    return {
      message: 'Company profile retrieved successfully',
      data: {
        ...companyWithUrls,
        subscription,
      },
    };
  }

  @Get('consumed-leads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all leads consumed by the authenticated company' })
  @ApiResponse({ status: 200, description: 'Consumed leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getConsumedLeads(@Request() req) {
    return {
      message: 'Consumed leads retrieved successfully',
      data: await this.companyService.getConsumedLeads(req.user.companyId),
    };
  }

  @Get('subscription/plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'Subscription plans retrieved successfully' })
  async getSubscriptionPlans(): Promise<{ message: string; data: Record<string, SubscriptionPlan> }> {
    return {
      message: 'Subscription plans retrieved successfully',
      data: this.razorpayService.getAllPlans(),
    };
  }

  @Get('subscription/current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current active subscription' })
  @ApiResponse({ status: 200, description: 'Current subscription retrieved successfully' })
  async getCurrentSubscription(@Request() req) {
    const subscription = await this.companyService.getActiveSubscription(req.user.companyId);
    return {
      message: 'Current subscription retrieved successfully',
      data: subscription,
    };
  }

  @Get('subscription/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subscription history' })
  @ApiResponse({ status: 200, description: 'Subscription history retrieved successfully' })
  async getSubscriptionHistory(@Request() req) {
    return {
      message: 'Subscription history retrieved successfully',
      data: await this.companyService.getSubscriptionHistory(req.user.companyId),
    };
  }

  @Post('subscription/create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create Razorpay order for subscription' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createSubscriptionOrder(@Request() req, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    const orderDetails = await this.companyService.createSubscriptionOrder(
      req.user.companyId,
      createSubscriptionDto.tier,
    );
    
    return {
      message: 'Order created successfully',
      data: {
        ...orderDetails,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
    };
  }

  @Post('subscription/verify-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify payment and activate subscription' })
  @ApiResponse({ status: 200, description: 'Payment verified and subscription activated' })
  async verifySubscriptionPayment(@Request() req, @Body() verifyPaymentDto: VerifyPaymentDto) {
    const subscription = await this.companyService.verifyAndActivateSubscription(
      req.user.companyId,
      verifyPaymentDto.razorpayOrderId,
      verifyPaymentDto.razorpayPaymentId,
      verifyPaymentDto.razorpaySignature,
    );
    
    return {
      message: 'Payment verified and subscription activated successfully',
      data: subscription,
    };
  }

  @Post('pay-as-you-go/create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create Razorpay order for pay-as-you-go leads' })
  @ApiResponse({ status: 201, description: 'Pay-as-you-go order created successfully' })
  async createPayAsYouGoOrder(@Request() req, @Body() payAsYouGoDto: PayAsYouGoDto) {
    const orderDetails = await this.companyService.createPayAsYouGoOrder(
      req.user.companyId,
      payAsYouGoDto.leadsCount,
    );
    
    return {
      message: 'Pay-as-you-go order created successfully',
      data: {
        ...orderDetails,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
    };
  }

  @Post('pay-as-you-go/verify-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verify payment and add leads to quota' })
  @ApiResponse({ status: 200, description: 'Payment verified and leads added' })
  async verifyPayAsYouGoPayment(@Request() req, @Body() verifyPaymentDto: VerifyPaymentDto) {
    const result = await this.companyService.verifyAndAddPayAsYouGoLeads(
      req.user.companyId,
      verifyPaymentDto.razorpayOrderId,
      verifyPaymentDto.razorpayPaymentId,
      verifyPaymentDto.razorpaySignature,
    );
    
    return {
      message: 'Payment verified and leads added successfully',
      data: result,
    };
  }

  @Get('payment-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get payment history for authenticated company' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  async getPaymentHistory(@Request() req) {
    return {
      message: 'Payment history retrieved successfully',
      data: await this.companyService.getPaymentHistory(req.user.companyId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company UUID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    const company = await this.companyService.findOne(id);
    const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(company);
    
    return {
      message: 'Company retrieved successfully',
      data: companyWithUrls,
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'userPhoto', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ])
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Update authenticated company profile with file uploads',
    description: 'Update profile with optional file uploads for user photo, logo, and cover image'
  })
  @ApiResponse({ status: 200, description: 'Company profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async updateProfile(
    @Request() req, 
    @Body() updateCompanyDto: UpdateCompanyDto,
    @UploadedFiles() files?: { 
      userPhoto?: Express.Multer.File[], 
      logo?: Express.Multer.File[],
      coverImage?: Express.Multer.File[]
    }
  ) {
    const updatedCompany = await this.companyService.updateWithFiles(
      req.user.companyId, 
      updateCompanyDto,
      files
    );
    
    // Generate signed URLs for response
    const companyWithUrls = await this.companyService.getCompanyWithSignedUrls(updatedCompany);
    
    return {
      message: 'Company profile updated successfully',
      data: companyWithUrls,
    };
  }
}