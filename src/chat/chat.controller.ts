// src/modules/chat/chat.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {
    console.log('ChatController initialized');
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a message to another company' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(@Request() req, @Body() sendMessageDto: SendMessageDto) {
    const message = await this.chatService.sendMessage(req.user.companyId, sendMessageDto);
    return {
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the authenticated company' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getConversations(@Request() req) {
    const conversations = await this.chatService.getAllConversations(req.user.companyId);
    return {
      message: 'Conversations retrieved successfully',
      data: conversations,
    };
  }

  @Get('history/:companyId')
  @ApiOperation({ summary: 'Get chat history with a specific company' })
  @ApiParam({ name: 'companyId', description: 'Company UUID to get chat history with' })
  @ApiResponse({ status: 200, description: 'Chat history retrieved successfully' })
  async getChatHistory(@Request() req, @Param('companyId') companyId: string) {
    const history = await this.chatService.getChatHistory(req.user.companyId, companyId);
    return {
      message: 'Chat history retrieved successfully',
      data: history,
    };
  }

  @Post('mark-read/:companyId')
  @ApiOperation({ summary: 'Mark all messages from a specific company as read' })
  @ApiParam({ name: 'companyId', description: 'Company UUID whose messages to mark as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(@Request() req, @Param('companyId') companyId: string) {
    await this.chatService.markAsRead(req.user.companyId, companyId);
    return {
      message: 'Messages marked as read',
      data: null,
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getTotalUnreadCount(@Request() req) {
    const count = await this.chatService.getTotalUnreadCount(req.user.companyId);
    return {
      message: 'Unread count retrieved successfully',
      data: { unreadCount: count },
    };
  }

  @Patch('message/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiParam({ name: 'messageId', description: 'Message UUID to edit' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 403, description: 'Can only edit your own messages' })
  async updateMessage(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto
  ) {
    const updatedMessage = await this.chatService.updateMessage(messageId, req.user.companyId, updateMessageDto);
    return {
      message: 'Message updated successfully',
      data: updatedMessage,
    };
  }

  @Delete('message/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'messageId', description: 'Message UUID to delete' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Can only delete your own messages' })
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    await this.chatService.deleteMessage(messageId, req.user.companyId);
    return {
      message: 'Message deleted successfully',
      data: null,
    };
  }
}