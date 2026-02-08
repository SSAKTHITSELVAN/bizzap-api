import { Company } from '../../company/entities/company.entity';
export declare enum MessageType {
    TEXT = "text",
    IMAGE = "image",
    VIDEO = "video",
    PDF = "pdf",
    FILE = "file"
}
export declare class Chat {
    id: string;
    senderId: string;
    receiverId: string;
    message: string;
    messageType: MessageType;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    thumbnailUrl: string;
    isEdited: boolean;
    isDeleted: boolean;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
    sender: Company;
    receiver: Company;
}
