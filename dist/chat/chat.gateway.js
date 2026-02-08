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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const chat_service_1 = require("./chat.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const stream_1 = require("stream");
let ChatGateway = class ChatGateway {
    jwtService;
    chatService;
    server;
    connectedUsers = new Map();
    constructor(jwtService, chatService) {
        this.jwtService = jwtService;
        this.chatService = chatService;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token);
            client.data.companyId = payload.companyId;
            this.connectedUsers.set(payload.companyId, client.id);
            client.join(`company_${payload.companyId}`);
            console.log(`Company ${payload.companyId} connected with socket ${client.id}`);
        }
        catch (error) {
            console.log('Invalid token, disconnecting client');
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        if (client.data.companyId) {
            this.connectedUsers.delete(client.data.companyId);
            console.log(`Company ${client.data.companyId} disconnected`);
        }
    }
    async handleSendMessage(data, client) {
        try {
            const senderId = client.data.companyId;
            const message = await this.chatService.sendMessage(senderId, data);
            client.emit('message_sent', {
                success: true,
                data: message,
            });
            const receiverSocketId = this.connectedUsers.get(data.receiverId);
            if (receiverSocketId) {
                this.server.to(receiverSocketId).emit('new_message', {
                    data: message,
                });
            }
            return { success: true, data: message };
        }
        catch (error) {
            client.emit('message_error', {
                success: false,
                error: error.message,
            });
            return { success: false, error: error.message };
        }
    }
    async handleSendFile(data, client) {
        try {
            const senderId = client.data.companyId;
            const fileBuffer = Buffer.from(data.fileData, 'base64');
            const file = {
                fieldname: 'file',
                originalname: data.fileName,
                encoding: '7bit',
                mimetype: data.mimeType,
                size: data.fileSize,
                buffer: fileBuffer,
                destination: '',
                filename: '',
                path: '',
                stream: stream_1.Readable.from(fileBuffer),
            };
            const message = await this.chatService.sendFileMessage(senderId, data.receiverId, file, data.message);
            client.emit('file_sent', {
                success: true,
                data: message,
            });
            const receiverSocketId = this.connectedUsers.get(data.receiverId);
            if (receiverSocketId) {
                this.server.to(receiverSocketId).emit('new_message', {
                    data: message,
                });
            }
            return { success: true, data: message };
        }
        catch (error) {
            client.emit('file_error', {
                success: false,
                error: error.message,
            });
            return { success: false, error: error.message };
        }
    }
    async handleJoinConversation(data, client) {
        const room = this.getConversationRoom(client.data.companyId, data.companyId);
        client.join(room);
        await this.chatService.markAsRead(client.data.companyId, data.companyId);
        return { success: true, room };
    }
    async handleLeaveConversation(data, client) {
        const room = this.getConversationRoom(client.data.companyId, data.companyId);
        client.leave(room);
        return { success: true };
    }
    handleTypingStart(data, client) {
        const receiverSocketId = this.connectedUsers.get(data.receiverId);
        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('user_typing', {
                companyId: client.data.companyId,
                typing: true,
            });
        }
    }
    handleTypingStop(data, client) {
        const receiverSocketId = this.connectedUsers.get(data.receiverId);
        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('user_typing', {
                companyId: client.data.companyId,
                typing: false,
            });
        }
    }
    async handleRequestFileUrl(data, client) {
        try {
            const fileUrl = await this.chatService.generateFileUrl(data.messageId, client.data.companyId);
            client.emit('file_url_response', {
                success: true,
                messageId: data.messageId,
                fileUrl,
            });
            return { success: true, fileUrl };
        }
        catch (error) {
            client.emit('file_url_error', {
                success: false,
                messageId: data.messageId,
                error: error.message,
            });
            return { success: false, error: error.message };
        }
    }
    getConversationRoom(companyId1, companyId2) {
        const sorted = [companyId1, companyId2].sort();
        return `conversation_${sorted[0]}_${sorted[1]}`;
    }
    async sendNotificationToUser(companyId, notification) {
        const socketId = this.connectedUsers.get(companyId);
        if (socketId) {
            this.server.to(socketId).emit('notification', notification);
        }
    }
    async sendUploadProgress(companyId, progress) {
        const socketId = this.connectedUsers.get(companyId);
        if (socketId) {
            this.server.to(socketId).emit('upload_progress', progress);
        }
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_message_dto_1.SendMessageDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_file'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendFile", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_conversation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_conversation'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleLeaveConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing_start'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTypingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing_stop'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTypingStop", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('request_file_url'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleRequestFileUrl", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        maxHttpBufferSize: 50 * 1024 * 1024,
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        chat_service_1.ChatService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map