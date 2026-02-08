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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const chat_service_1 = require("./chat.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const update_message_dto_1 = require("./dto/update-message.dto");
const jwt_auth_guard_1 = require("../core/guards/jwt-auth.guard");
let ChatController = class ChatController {
    chatService;
    constructor(chatService) {
        this.chatService = chatService;
        console.log('ChatController initialized');
    }
    async sendMessage(req, sendMessageDto) {
        if (!sendMessageDto.message && !sendMessageDto.fileName) {
            throw new common_1.BadRequestException('Either message or file must be provided');
        }
        const message = await this.chatService.sendMessage(req.user.companyId, sendMessageDto);
        return {
            message: 'Message sent successfully',
            data: message,
        };
    }
    async sendFile(req, file, receiverId, message) {
        if (!receiverId) {
            throw new common_1.BadRequestException('receiverId is required');
        }
        const fileMessage = await this.chatService.sendFileMessage(req.user.companyId, receiverId, file, message);
        return {
            message: 'File sent successfully',
            data: fileMessage,
        };
    }
    async getConversations(req) {
        const conversations = await this.chatService.getAllConversations(req.user.companyId);
        return {
            message: 'Conversations retrieved successfully',
            data: conversations,
        };
    }
    async getChatHistory(req, companyId) {
        const history = await this.chatService.getChatHistory(req.user.companyId, companyId);
        return {
            message: 'Chat history retrieved successfully',
            data: history,
        };
    }
    async getFileUrl(req, messageId) {
        const fileUrl = await this.chatService.generateFileUrl(messageId, req.user.companyId);
        return {
            message: 'File URL generated successfully',
            data: { fileUrl },
        };
    }
    async markAsRead(req, companyId) {
        await this.chatService.markAsRead(req.user.companyId, companyId);
        return {
            message: 'Messages marked as read',
            data: null,
        };
    }
    async getTotalUnreadCount(req) {
        const count = await this.chatService.getTotalUnreadCount(req.user.companyId);
        return {
            message: 'Unread count retrieved successfully',
            data: { unreadCount: count },
        };
    }
    async updateMessage(req, messageId, updateMessageDto) {
        const updatedMessage = await this.chatService.updateMessage(messageId, req.user.companyId, updateMessageDto);
        return {
            message: 'Message updated successfully',
            data: updatedMessage,
        };
    }
    async deleteMessage(req, messageId) {
        await this.chatService.deleteMessage(messageId, req.user.companyId);
        return {
            message: 'Message deleted successfully',
            data: null,
        };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('send'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a text message to another company' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Message sent successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('send-file'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a file (image, video, PDF, etc.) to another company' }),
    (0, swagger_1.ApiBody)({
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
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'File sent successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - invalid file or missing receiverId' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
            new common_1.FileTypeValidator({
                fileType: /(image|video|application\/pdf|text|application\/msword|application\/vnd\.).*/
            }),
        ],
    }))),
    __param(2, (0, common_1.Body)('receiverId')),
    __param(3, (0, common_1.Body)('message')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendFile", null);
__decorate([
    (0, common_1.Get)('conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all conversations for the authenticated company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Conversations retrieved successfully' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('history/:companyId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get chat history with a specific company' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company UUID to get chat history with' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Chat history retrieved successfully' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getChatHistory", null);
__decorate([
    (0, common_1.Get)('file/:messageId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a downloadable URL for a file in a message' }),
    (0, swagger_1.ApiParam)({ name: 'messageId', description: 'Message UUID containing the file' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'File URL generated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'You can only access files from your conversations' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Message or file not found' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('messageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getFileUrl", null);
__decorate([
    (0, common_1.Post)('mark-read/:companyId'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark all messages from a specific company as read' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company UUID whose messages to mark as read' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Messages marked as read' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get total unread message count' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Unread count retrieved successfully' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getTotalUnreadCount", null);
__decorate([
    (0, common_1.Patch)('message/:messageId'),
    (0, swagger_1.ApiOperation)({ summary: 'Edit a text message (only text messages can be edited)' }),
    (0, swagger_1.ApiParam)({ name: 'messageId', description: 'Message UUID to edit' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Message updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Can only edit your own text messages' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('messageId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_message_dto_1.UpdateMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateMessage", null);
__decorate([
    (0, common_1.Delete)('message/:messageId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a message (and associated file if any)' }),
    (0, swagger_1.ApiParam)({ name: 'messageId', description: 'Message UUID to delete' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Message deleted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Can only delete your own messages' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('messageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteMessage", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map