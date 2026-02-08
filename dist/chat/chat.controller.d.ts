import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    sendMessage(req: any, sendMessageDto: SendMessageDto): Promise<{
        message: string;
        data: import("./entities/chat.entity").Chat;
    }>;
    sendFile(req: any, file: Express.Multer.File, receiverId: string, message?: string): Promise<{
        message: string;
        data: import("./entities/chat.entity").Chat;
    }>;
    getConversations(req: any): Promise<{
        message: string;
        data: any[];
    }>;
    getChatHistory(req: any, companyId: string): Promise<{
        message: string;
        data: any[];
    }>;
    getFileUrl(req: any, messageId: string): Promise<{
        message: string;
        data: {
            fileUrl: string;
        };
    }>;
    markAsRead(req: any, companyId: string): Promise<{
        message: string;
        data: null;
    }>;
    getTotalUnreadCount(req: any): Promise<{
        message: string;
        data: {
            unreadCount: number;
        };
    }>;
    updateMessage(req: any, messageId: string, updateMessageDto: UpdateMessageDto): Promise<{
        message: string;
        data: import("./entities/chat.entity").Chat;
    }>;
    deleteMessage(req: any, messageId: string): Promise<{
        message: string;
        data: null;
    }>;
}
