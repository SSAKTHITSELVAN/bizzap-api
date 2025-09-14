// src/modules/chat/chat.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {}

  async sendMessage(senderId: string, sendMessageDto: SendMessageDto): Promise<Chat> {
    const chat = this.chatRepository.create({
      senderId,
      receiverId: sendMessageDto.receiverId,
      message: sendMessageDto.message,
    });
    
    return this.chatRepository.save(chat);
  }

  async getChatHistory(companyId: string, otherCompanyId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: [
        { senderId: companyId, receiverId: otherCompanyId, isDeleted: false },
        { senderId: otherCompanyId, receiverId: companyId, isDeleted: false },
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
    });
  }

  async getAllConversations(companyId: string): Promise<any[]> {
    // console.log('Getting conversations for company:', companyId);
    
    // First, get all messages involving this company
    const allMessages = await this.chatRepository.find({
      where: [
        { senderId: companyId, isDeleted: false },
        { receiverId: companyId, isDeleted: false },
      ],
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    });

    // console.log('Found messages:', allMessages.length);

    if (allMessages.length === 0) {
      return [];
    }

    // Group messages by conversation partner
    const conversationMap = new Map<string, any>();

    for (const message of allMessages) {
      // Determine who the conversation partner is
      const partnerId = message.senderId === companyId ? message.receiverId : message.senderId;
      const partner = message.senderId === companyId ? message.receiver : message.sender;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: message.message,
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
          existingConv.lastMessage = message.message;
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

    // console.log('Returning conversations:', conversations.length);
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
}