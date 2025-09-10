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