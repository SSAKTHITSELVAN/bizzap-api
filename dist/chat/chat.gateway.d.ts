import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
interface FileMessageData {
    receiverId: string;
    message?: string;
    fileName: string;
    fileData: string;
    mimeType: string;
    fileSize: number;
}
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private chatService;
    server: Server;
    private connectedUsers;
    constructor(jwtService: JwtService, chatService: ChatService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleSendMessage(data: SendMessageDto, client: Socket): Promise<{
        success: boolean;
        data: import("./entities/chat.entity").Chat;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    handleSendFile(data: FileMessageData, client: Socket): Promise<{
        success: boolean;
        data: import("./entities/chat.entity").Chat;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    handleJoinConversation(data: {
        companyId: string;
    }, client: Socket): Promise<{
        success: boolean;
        room: string;
    }>;
    handleLeaveConversation(data: {
        companyId: string;
    }, client: Socket): Promise<{
        success: boolean;
    }>;
    handleTypingStart(data: {
        receiverId: string;
    }, client: Socket): void;
    handleTypingStop(data: {
        receiverId: string;
    }, client: Socket): void;
    handleRequestFileUrl(data: {
        messageId: string;
    }, client: Socket): Promise<{
        success: boolean;
        fileUrl: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        fileUrl?: undefined;
    }>;
    private getConversationRoom;
    sendNotificationToUser(companyId: string, notification: any): Promise<void>;
    sendUploadProgress(companyId: string, progress: {
        messageId: string;
        progress: number;
    }): Promise<void>;
}
export {};
