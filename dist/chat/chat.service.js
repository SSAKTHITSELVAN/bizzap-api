"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chat_entity_1 = require("./entities/chat.entity");
const s3_service_1 = require("./s3.service");
let ChatService = class ChatService {
    chatRepository;
    s3Service;
    constructor(chatRepository, s3Service) {
        this.chatRepository = chatRepository;
        this.s3Service = s3Service;
    }
    async sendMessage(senderId, sendMessageDto) {
        const chat = this.chatRepository.create({
            senderId,
            receiverId: sendMessageDto.receiverId,
            message: sendMessageDto.message,
            messageType: sendMessageDto.messageType || chat_entity_1.MessageType.TEXT,
            fileName: sendMessageDto.fileName,
        });
        return this.chatRepository.save(chat);
    }
    async sendFileMessage(senderId, receiverId, file, message) {
        try {
            const uploadResult = await this.s3Service.uploadFile(file);
            const messageType = this.getMessageTypeFromMime(file.mimetype);
            let thumbnailUrl = null;
            if (messageType === chat_entity_1.MessageType.IMAGE || messageType === chat_entity_1.MessageType.VIDEO) {
                thumbnailUrl = await this.s3Service.generateThumbnail(file);
            }
            const chat = this.chatRepository.create({
                senderId,
                receiverId,
                message: message || undefined,
                messageType,
                fileName: file.originalname,
                fileUrl: uploadResult.key,
                fileSize: uploadResult.size,
                mimeType: uploadResult.mimeType,
                thumbnailUrl: thumbnailUrl || undefined,
            });
            return this.chatRepository.save(chat);
        }
        catch (error) {
            throw new Error(`Failed to send file message: ${error.message}`);
        }
    }
    async getChatHistory(companyId, otherCompanyId) {
        const messages = await this.chatRepository.find({
            where: [
                { senderId: companyId, receiverId: otherCompanyId, isDeleted: false },
                { senderId: otherCompanyId, receiverId: companyId, isDeleted: false },
            ],
            relations: ['sender', 'receiver'],
            order: { createdAt: 'ASC' },
        });
        return this.generateSignedUrlsForMessages(messages);
    }
    async getAllConversations(companyId) {
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
        const conversationMap = new Map();
        for (const message of allMessages) {
            const partnerId = message.senderId === companyId ? message.receiverId : message.senderId;
            const partner = message.senderId === companyId ? message.receiver : message.sender;
            let lastMessagePreview = '';
            if (message.messageType === chat_entity_1.MessageType.TEXT) {
                lastMessagePreview = message.message || '';
            }
            else if (message.messageType === chat_entity_1.MessageType.IMAGE) {
                lastMessagePreview = '📷 Photo';
            }
            else if (message.messageType === chat_entity_1.MessageType.VIDEO) {
                lastMessagePreview = '🎥 Video';
            }
            else if (message.messageType === chat_entity_1.MessageType.PDF) {
                lastMessagePreview = `📄 ${message.fileName || 'PDF'}`;
            }
            else {
                lastMessagePreview = `📎 ${message.fileName || 'File'}`;
            }
            if (!conversationMap.has(partnerId)) {
                conversationMap.set(partnerId, {
                    partnerId,
                    partner,
                    lastMessage: lastMessagePreview,
                    lastMessageAt: message.createdAt,
                    lastMessageType: message.messageType,
                    lastMessageFile: message.fileUrl,
                    lastMessageThumbnail: message.thumbnailUrl,
                    messageCount: 1,
                    messages: [message]
                });
            }
            else {
                const existingConv = conversationMap.get(partnerId);
                existingConv.messageCount++;
                existingConv.messages.push(message);
                if (message.createdAt > existingConv.lastMessageAt) {
                    existingConv.lastMessage = lastMessagePreview;
                    existingConv.lastMessageAt = message.createdAt;
                    existingConv.lastMessageType = message.messageType;
                    existingConv.lastMessageFile = message.fileUrl;
                    existingConv.lastMessageThumbnail = message.thumbnailUrl;
                }
            }
        }
        const conversations = [];
        for (const [partnerId, conv] of conversationMap) {
            const unreadCount = await this.getUnreadCount(companyId, partnerId);
            let partnerLogo = conv.partner.logo || null;
            if (partnerLogo && this.s3Service.isS3Key(partnerLogo)) {
                try {
                    partnerLogo = await this.s3Service.generateSignedUrl(partnerLogo, 3600);
                }
                catch (error) {
                    console.error(`Failed to generate signed URL for partner logo:`, error);
                }
            }
            let lastMessageFileUrl = null;
            let lastMessageThumbnailUrl = null;
            if (conv.lastMessageFile) {
                try {
                    lastMessageFileUrl = await this.s3Service.generateSignedUrl(conv.lastMessageFile, 3600);
                }
                catch (error) {
                    console.error(`Failed to generate signed URL for last message file:`, error);
                }
            }
            if (conv.lastMessageThumbnail) {
                try {
                    lastMessageThumbnailUrl = await this.s3Service.generateSignedUrl(conv.lastMessageThumbnail, 3600);
                }
                catch (error) {
                    console.error(`Failed to generate signed URL for last message thumbnail:`, error);
                }
            }
            conversations.push({
                partnerId: conv.partnerId,
                partner: {
                    id: conv.partner.id,
                    companyName: conv.partner.companyName,
                    phoneNumber: conv.partner.phoneNumber,
                    logo: partnerLogo,
                },
                lastMessage: conv.lastMessage,
                lastMessageAt: conv.lastMessageAt,
                lastMessageType: conv.lastMessageType,
                lastMessageFileUrl: lastMessageFileUrl,
                lastMessageThumbnailUrl: lastMessageThumbnailUrl,
                messageCount: conv.messageCount,
                unreadCount,
            });
        }
        conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        return conversations;
    }
    async updateMessage(messageId, senderId, updateMessageDto) {
        const message = await this.chatRepository.findOne({
            where: { id: messageId },
            relations: ['sender', 'receiver'],
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.senderId !== senderId) {
            throw new common_1.ForbiddenException('You can only edit your own messages');
        }
        if (message.messageType !== chat_entity_1.MessageType.TEXT) {
            throw new common_1.ForbiddenException('You can only edit text messages');
        }
        message.message = updateMessageDto.message;
        message.isEdited = true;
        return this.chatRepository.save(message);
    }
    async deleteMessage(messageId, senderId) {
        const message = await this.chatRepository.findOne({
            where: { id: messageId },
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.senderId !== senderId) {
            throw new common_1.ForbiddenException('You can only delete your own messages');
        }
        if (message.fileUrl) {
            try {
                await this.s3Service.deleteFile(message.fileUrl);
                if (message.thumbnailUrl) {
                    await this.s3Service.deleteFile(message.thumbnailUrl);
                }
            }
            catch (error) {
                console.error(`Failed to delete file from S3: ${error.message}`);
            }
        }
        message.isDeleted = true;
        await this.chatRepository.save(message);
    }
    async markAsRead(companyId, otherCompanyId) {
        await this.chatRepository.update({
            senderId: otherCompanyId,
            receiverId: companyId,
            isRead: false,
            isDeleted: false
        }, { isRead: true });
    }
    async getUnreadCount(companyId, fromCompanyId) {
        return this.chatRepository.count({
            where: {
                senderId: fromCompanyId,
                receiverId: companyId,
                isRead: false,
                isDeleted: false,
            },
        });
    }
    async getTotalUnreadCount(companyId) {
        return this.chatRepository.count({
            where: {
                receiverId: companyId,
                isRead: false,
                isDeleted: false,
            },
        });
    }
    getMessageTypeFromMime(mimeType) {
        if (mimeType.startsWith('image/'))
            return chat_entity_1.MessageType.IMAGE;
        if (mimeType.startsWith('video/'))
            return chat_entity_1.MessageType.VIDEO;
        if (mimeType === 'application/pdf')
            return chat_entity_1.MessageType.PDF;
        return chat_entity_1.MessageType.FILE;
    }
    async generateFileUrl(messageId, companyId) {
        const message = await this.chatRepository.findOne({
            where: {
                id: messageId,
                isDeleted: false
            }
        });
        if (!message) {
            throw new common_1.NotFoundException('Message not found');
        }
        if (message.senderId !== companyId && message.receiverId !== companyId) {
            throw new common_1.ForbiddenException('You can only access files from your conversations');
        }
        if (!message.fileUrl) {
            throw new common_1.NotFoundException('No file associated with this message');
        }
        return this.s3Service.generateSignedUrl(message.fileUrl, 3600);
    }
    async generateSignedUrlsForMessages(messages) {
        return Promise.all(messages.map(async (message) => {
            const messageObj = { ...message };
            if (message.fileUrl) {
                try {
                    messageObj.fileUrl = await this.s3Service.generateSignedUrl(message.fileUrl, 3600);
                }
                catch (error) {
                    console.error(`Failed to generate signed URL for message ${message.id} file:`, error);
                }
            }
            if (message.thumbnailUrl) {
                try {
                    messageObj.thumbnailUrl = await this.s3Service.generateSignedUrl(message.thumbnailUrl, 3600);
                }
                catch (error) {
                    console.error(`Failed to generate signed URL for message ${message.id} thumbnail:`, error);
                }
            }
            if (messageObj.sender) {
                await this.generateSignedUrlsForCompany(messageObj.sender);
            }
            if (messageObj.receiver) {
                await this.generateSignedUrlsForCompany(messageObj.receiver);
            }
            return messageObj;
        }));
    }
    async generateSignedUrlsForCompany(company) {
        if (!company)
            return;
        try {
            if (company.logo && this.s3Service.isS3Key(company.logo)) {
                company.logo = await this.s3Service.generateSignedUrl(company.logo, 3600);
            }
            if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
                company.userPhoto = await this.s3Service.generateSignedUrl(company.userPhoto, 3600);
            }
            if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
                company.coverImage = await this.s3Service.generateSignedUrl(company.coverImage, 3600);
            }
        }
        catch (error) {
            console.error(`Failed to generate signed URLs for company ${company.id}:`, error);
        }
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(chat_entity_1.Chat)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        s3_service_1.S3Service])
], ChatService);
//# sourceMappingURL=chat.service.js.map