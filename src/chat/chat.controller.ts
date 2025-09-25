// src/modules/chat/chat.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Send a text message to another company' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(@Request() req, @Body() sendMessageDto: SendMessageDto) {
    if (!sendMessageDto.message && !sendMessageDto.fileName) {
      throw new BadRequestException('Either message or file must be provided');
    }

    const message = await this.chatService.sendMessage(req.user.companyId, sendMessageDto);
    return {
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Post('send-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send a file (image, video, PDF, etc.) to another company' })
  @ApiBody({
    description: 'File upload with optional message',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        receiverId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID of the company receiving the file',
        },
        message: {
          type: 'string',
          description: 'Optional text message to accompany the file',
        },
      },
      required: ['file', 'receiverId'],
    },
  })
  @ApiResponse({ status: 201, description: 'File sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or missing receiverId' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendFile(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ 
            fileType: /(image|video|application\/pdf|text|application\/msword|application\/vnd\.).*/ 
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('receiverId') receiverId: string,
    @Body('message') message?: string,
  ) {
    if (!receiverId) {
      throw new BadRequestException('receiverId is required');
    }

    const fileMessage = await this.chatService.sendFileMessage(
      req.user.companyId,
      receiverId,
      file,
      message
    );

    return {
      message: 'File sent successfully',
      data: fileMessage,
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

  @Get('file/:messageId')
  @ApiOperation({ summary: 'Get a downloadable URL for a file in a message' })
  @ApiParam({ name: 'messageId', description: 'Message UUID containing the file' })
  @ApiResponse({ status: 200, description: 'File URL generated successfully' })
  @ApiResponse({ status: 403, description: 'You can only access files from your conversations' })
  @ApiResponse({ status: 404, description: 'Message or file not found' })
  async getFileUrl(@Request() req, @Param('messageId') messageId: string) {
    const fileUrl = await this.chatService.generateFileUrl(messageId, req.user.companyId);
    return {
      message: 'File URL generated successfully',
      data: { fileUrl },
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
  @ApiOperation({ summary: 'Edit a text message (only text messages can be edited)' })
  @ApiParam({ name: 'messageId', description: 'Message UUID to edit' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 403, description: 'Can only edit your own text messages' })
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
  @ApiOperation({ summary: 'Delete a message (and associated file if any)' })
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