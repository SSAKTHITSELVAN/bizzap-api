import { MessageType } from '../entities/chat.entity';
export declare class SendMessageDto {
    receiverId: string;
    message?: string;
    messageType?: MessageType;
    fileName?: string;
}
