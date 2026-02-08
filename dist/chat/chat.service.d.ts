import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { S3Service } from './s3.service';
export declare class ChatService {
    private chatRepository;
    private s3Service;
    constructor(chatRepository: Repository<Chat>, s3Service: S3Service);
    sendMessage(senderId: string, sendMessageDto: SendMessageDto): Promise<Chat>;
    sendFileMessage(senderId: string, receiverId: string, file: Express.Multer.File, message?: string): Promise<Chat>;
    getChatHistory(companyId: string, otherCompanyId: string): Promise<any[]>;
    getAllConversations(companyId: string): Promise<any[]>;
    updateMessage(messageId: string, senderId: string, updateMessageDto: UpdateMessageDto): Promise<Chat>;
    deleteMessage(messageId: string, senderId: string): Promise<void>;
    markAsRead(companyId: string, otherCompanyId: string): Promise<void>;
    getUnreadCount(companyId: string, fromCompanyId: string): Promise<number>;
    getTotalUnreadCount(companyId: string): Promise<number>;
    private getMessageTypeFromMime;
    generateFileUrl(messageId: string, companyId: string): Promise<string>;
    private generateSignedUrlsForMessages;
    private generateSignedUrlsForCompany;
}
