import { ConfigService } from '@nestjs/config';
export declare enum AssetType {
    COMPANY_LOGO = "company-logos",
    USER_PHOTO = "user-photos",
    COVER_IMAGE = "cover-images",
    CHAT_FILE = "chat-files",
    PRODUCT_IMAGE = "product-images"
}
export declare class S3Service {
    private configService;
    private s3;
    private bucketName;
    constructor(configService: ConfigService);
    uploadFile(file: Express.Multer.File, folder?: string): Promise<{
        url: string;
        key: string;
        size: number;
        mimeType: string;
    }>;
    uploadCompanyLogo(file: Express.Multer.File): Promise<string>;
    uploadUserPhoto(file: Express.Multer.File): Promise<string>;
    uploadCoverImage(file: Express.Multer.File): Promise<string>;
    private validateImageFile;
    generateSignedUrl(key: string, expiresIn?: number): Promise<string>;
    deleteFile(key: string): Promise<void>;
    isS3Key(path: string): boolean;
    getAccessibleUrl(path: string | null | undefined, expiresIn?: number): Promise<string | null>;
    generateThumbnail(file: Express.Multer.File): Promise<string | null>;
    getFileTypeFromMime(mimeType: string): string;
    testConnection(): Promise<boolean>;
}
