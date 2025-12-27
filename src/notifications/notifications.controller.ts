// src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { SendBroadcastDto } from './dto/send-broadcast.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ========== USER ENDPOINTS ==========

  @Post('register-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Register Expo push token for notifications' })
  @ApiResponse({ status: 201, description: 'Token registered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerToken(
    @Request() req,
    @Body() registerTokenDto: RegisterTokenDto,
  ) {
    const token = await this.notificationsService.registerPushToken(
      req.user.companyId,
      registerTokenDto.token,
      registerTokenDto.deviceId,
      registerTokenDto.platform,
    );
    return {
      message: 'Push token registered successfully',
      data: token,
    };
  }

  @Post('unregister-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unregister Expo push token' })
  @ApiResponse({ status: 200, description: 'Token unregistered successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unregisterToken(@Body('token') token: string) {
    await this.notificationsService.unregisterPushToken(token);
    return {
      message: 'Push token unregistered successfully',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all notifications for authenticated user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserNotifications(@Request() req) {
    const notifications = await this.notificationsService.getUserNotifications(
      req.user.companyId,
    );
    return {
      message: 'Notifications retrieved successfully',
      data: notifications,
    };
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.companyId,
    );
    return {
      message: 'Unread count retrieved successfully',
      data: { count },
    };
  }

  @Post('mark-read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(@Body() markReadDto: MarkNotificationReadDto) {
    await this.notificationsService.markAsRead(markReadDto.notificationIds);
    return {
      message: 'Notifications marked as read',
    };
  }

  @Post('mark-all-read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.companyId);
    return {
      message: 'All notifications marked as read',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(@Request() req, @Param('id') id: string) {
    await this.notificationsService.deleteNotification(id, req.user.companyId);
    return {
      message: 'Notification deleted successfully',
    };
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete all notifications for authenticated user' })
  @ApiResponse({ status: 200, description: 'All notifications deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAllNotifications(@Request() req) {
    await this.notificationsService.deleteAllNotifications(req.user.companyId);
    return {
      message: 'All notifications deleted successfully',
    };
  }

  // ========== ADMIN ENDPOINTS ==========

  @Post('broadcast')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Send broadcast notification to all users (Admin only)',
    description: 'Admin endpoint to send notifications to all registered users'
  })
  @ApiResponse({ status: 200, description: 'Broadcast sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async sendBroadcast(@Body() broadcastDto: SendBroadcastDto) {
    // TODO: Add admin guard here
    await this.notificationsService.sendBroadcastNotification(
      broadcastDto.title,
      broadcastDto.body,
      broadcastDto.data,
    );
    return {
      message: 'Broadcast notification sent successfully',
    };
  }
}