// src/chat/chat.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, MessageType } from './entities/chat.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { S3Service } from './s3.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    private s3Service: S3Service,
  ) {}

  async sendMessage(senderId: string, sendMessageDto: SendMessageDto): Promise<Chat> {
    const chat = this.chatRepository.create({
      senderId,
      receiverId: sendMessageDto.receiverId,
      message: sendMessageDto.message,
      messageType: sendMessageDto.messageType || MessageType.TEXT,
      fileName: sendMessageDto.fileName,
    });
    
    return this.chatRepository.save(chat);
  }

  async sendFileMessage(
    senderId: string, 
    receiverId: string, 
    file: Express.Multer.File,
    message?: string
  ): Promise<Chat> {
    try {
      // Upload file to S3
      const uploadResult = await this.s3Service.uploadFile(file);
      
      // Determine message type based on file mime type
      const messageType = this.getMessageTypeFromMime(file.mimetype);
      
      // Generate thumbnail if needed (for images/videos)
      let thumbnailUrl: string | null = null;
      if (messageType === MessageType.IMAGE || messageType === MessageType.VIDEO) {
        thumbnailUrl = await this.s3Service.generateThumbnail(file);
      }

      const chat = this.chatRepository.create({
        senderId,
        receiverId,
        message: message || undefined, // Use undefined instead of null for TypeScript compatibility
        messageType,
        fileName: file.originalname,
        fileUrl: uploadResult.key, // Store S3 key, not direct URL
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        thumbnailUrl: thumbnailUrl || undefined, // Use undefined instead of null
      });

      return this.chatRepository.save(chat);
    } catch (error) {
      throw new Error(`Failed to send file message: ${error.message}`);
    }
  }

  async getChatHistory(companyId: string, otherCompanyId: string): Promise<any[]> {
    const messages = await this.chatRepository.find({
      where: [
        { senderId: companyId, receiverId: otherCompanyId, isDeleted: false },
        { senderId: otherCompanyId, receiverId: companyId, isDeleted: false },
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
    });

    // Generate signed URLs for files
    const messagesWithUrls = await Promise.all(
      messages.map(async (message) => {
        const messageObj = { ...message };
        
        if (message.fileUrl) {
          try {
            messageObj.fileUrl = await this.s3Service.generateSignedUrl(message.fileUrl);
            
            if (message.thumbnailUrl) {
              messageObj.thumbnailUrl = await this.s3Service.generateSignedUrl(message.thumbnailUrl);
            }
          } catch (error) {
            console.error(`Failed to generate signed URL for message ${message.id}:`, error);
            // Keep the original URL or set to null
          }
        }
        
        return messageObj;
      })
    );

    return messagesWithUrls;
  }

  async getAllConversations(companyId: string): Promise<any[]> {
    // First, get all messages involving this company
    const allMessages = await this.chatRepository.find({
      where: [
        { senderId: companyId, isDeleted: false },
        { receiverId: companyId, isDeleted: false },
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });

    if (allMessages.length === 0) {
      return [];
    }

    // Group messages by conversation partner
    const conversationMap = new Map<string, any>();

    for (const message of allMessages) {
      // Determine who the conversation partner is
      const partnerId = message.senderId === companyId ? message.receiverId : message.senderId;
      const partner = message.senderId === companyId ? message.receiver : message.sender;

      // Create preview for different message types
      let lastMessagePreview = '';
      if (message.messageType === MessageType.TEXT) {
        lastMessagePreview = message.message || '';
      } else if (message.messageType === MessageType.IMAGE) {
        lastMessagePreview = '📷 Photo';
      } else if (message.messageType === MessageType.VIDEO) {
        lastMessagePreview = '🎥 Video';
      } else if (message.messageType === MessageType.PDF) {
        lastMessagePreview = `📄 ${message.fileName || 'PDF'}`;
      } else {
        lastMessagePreview = `📎 ${message.fileName || 'File'}`;
      }

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: lastMessagePreview,
          lastMessageAt: message.createdAt,
          messageCount: 1,
          messages: [message]
        });
      } else {
        const existingConv = conversationMap.get(partnerId);
        existingConv.messageCount++;
        existingConv.messages.push(message);
        
        // Keep the most recent message as lastMessage
        if (message.createdAt > existingConv.lastMessageAt) {
          existingConv.lastMessage = lastMessagePreview;
          existingConv.lastMessageAt = message.createdAt;
        }
      }
    }

    // Convert to array and add unread counts
    const conversations: any[] = [];
    for (const [partnerId, conv] of conversationMap) {
      const unreadCount = await this.getUnreadCount(companyId, partnerId);
      
      conversations.push({
        partnerId: conv.partnerId,
        partner: {
          id: conv.partner.id,
          companyName: conv.partner.companyName,
          phoneNumber: conv.partner.phoneNumber,
          logo: conv.partner.logo || null,
        },
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
        unreadCount,
      });
    }

    // Sort by most recent message
    conversations.sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return conversations;
  }

  async updateMessage(messageId: string, senderId: string, updateMessageDto: UpdateMessageDto): Promise<Chat> {
    const message = await this.chatRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== senderId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Only allow editing text messages
    if (message.messageType !== MessageType.TEXT) {
      throw new ForbiddenException('You can only edit text messages');
    }

    message.message = updateMessageDto.message;
    message.isEdited = true;
    return this.chatRepository.save(message);
  }

  async deleteMessage(messageId: string, senderId: string): Promise<void> {
    const message = await this.chatRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== senderId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // If message has a file, delete it from S3
    if (message.fileUrl) {
      try {
        await this.s3Service.deleteFile(message.fileUrl);
        if (message.thumbnailUrl) {
          await this.s3Service.deleteFile(message.thumbnailUrl);
        }
      } catch (error) {
        console.error(`Failed to delete file from S3: ${error.message}`);
        // Continue with marking message as deleted even if S3 deletion fails
      }
    }

    message.isDeleted = true;
    await this.chatRepository.save(message);
  }

  async markAsRead(companyId: string, otherCompanyId: string): Promise<void> {
    await this.chatRepository.update(
      { 
        senderId: otherCompanyId, 
        receiverId: companyId, 
        isRead: false,
        isDeleted: false 
      },
      { isRead: true }
    );
  }

  async getUnreadCount(companyId: string, fromCompanyId: string): Promise<number> {
    return this.chatRepository.count({
      where: {
        senderId: fromCompanyId,
        receiverId: companyId,
        isRead: false,
        isDeleted: false,
      },
    });
  }

  async getTotalUnreadCount(companyId: string): Promise<number> {
    return this.chatRepository.count({
      where: {
        receiverId: companyId,
        isRead: false,
        isDeleted: false,
      },
    });
  }

  private getMessageTypeFromMime(mimeType: string): MessageType {
    if (mimeType.startsWith('image/')) return MessageType.IMAGE;
    if (mimeType.startsWith('video/')) return MessageType.VIDEO;
    if (mimeType === 'application/pdf') return MessageType.PDF;
    return MessageType.FILE;
  }

  async generateFileUrl(messageId: string, companyId: string): Promise<string> {
    const message = await this.chatRepository.findOne({
      where: { 
        id: messageId,
        isDeleted: false
      }
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is part of the conversation
    if (message.senderId !== companyId && message.receiverId !== companyId) {
      throw new ForbiddenException('You can only access files from your conversations');
    }

    if (!message.fileUrl) {
      throw new NotFoundException('No file associated with this message');
    }

    return this.s3Service.generateSignedUrl(message.fileUrl, 3600); // 1 hour expiry
  }
}