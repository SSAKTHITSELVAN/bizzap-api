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
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = exports.AssetType = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const aws_sdk_1 = require("aws-sdk");
const uuid_1 = require("uuid");
var AssetType;
(function (AssetType) {
    AssetType["COMPANY_LOGO"] = "company-logos";
    AssetType["USER_PHOTO"] = "user-photos";
    AssetType["COVER_IMAGE"] = "cover-images";
    AssetType["CHAT_FILE"] = "chat-files";
    AssetType["PRODUCT_IMAGE"] = "product-images";
})(AssetType || (exports.AssetType = AssetType = {}));
let S3Service = class S3Service {
    configService;
    s3;
    bucketName;
    constructor(configService) {
        this.configService = configService;
        this.s3 = new aws_sdk_1.S3({
            region: this.configService.get('AWS_REGION'),
            accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
            secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        });
        const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
        if (!bucketName) {
            throw new Error('AWS_S3_BUCKET_NAME is not configured in environment variables');
        }
        this.bucketName = bucketName;
    }
    async uploadFile(file, folder = 'chat-files') {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${folder}/${(0, uuid_1.v4)()}.${fileExtension}`;
        const uploadParams = {
            Bucket: this.bucketName,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'private',
        };
        try {
            const result = await this.s3.upload(uploadParams).promise();
            return {
                url: result.Location,
                key: fileName,
                size: file.size,
                mimeType: file.mimetype,
            };
        }
        catch (error) {
            console.error('S3 Upload Error:', error);
            throw new Error(`Failed to upload file to S3: ${error.message}`);
        }
    }
    async uploadCompanyLogo(file) {
        this.validateImageFile(file);
        const result = await this.uploadFile(file, AssetType.COMPANY_LOGO);
        return result.key;
    }
    async uploadUserPhoto(file) {
        this.validateImageFile(file);
        const result = await this.uploadFile(file, AssetType.USER_PHOTO);
        return result.key;
    }
    async uploadCoverImage(file) {
        this.validateImageFile(file);
        const result = await this.uploadFile(file, AssetType.COVER_IMAGE);
        return result.key;
    }
    validateImageFile(file) {
        const maxSize = 5 * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
        }
        if (file.size > maxSize) {
            throw new Error('File size exceeds 5MB limit');
        }
    }
    async generateSignedUrl(key, expiresIn = 3600) {
        try {
            return this.s3.getSignedUrl('getObject', {
                Bucket: this.bucketName,
                Key: key,
                Expires: expiresIn,
            });
        }
        catch (error) {
            console.error('S3 Signed URL Error:', error);
            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }
    async deleteFile(key) {
        try {
            await this.s3.deleteObject({
                Bucket: this.bucketName,
                Key: key,
            }).promise();
        }
        catch (error) {
            console.error('S3 Delete Error:', error);
            throw new Error(`Failed to delete file from S3: ${error.message}`);
        }
    }
    isS3Key(path) {
        if (!path)
            return false;
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return false;
        }
        const s3KeyPattern = /^(company-logos|user-photos|cover-images|chat-files|product-images)\/.+\..+$/;
        return s3KeyPattern.test(path);
    }
    async getAccessibleUrl(path, expiresIn = 3600) {
        if (!path)
            return null;
        if (this.isS3Key(path)) {
            try {
                return await this.generateSignedUrl(path, expiresIn);
            }
            catch (error) {
                console.error(`Failed to generate signed URL for ${path}:`, error);
                return null;
            }
        }
        return path;
    }
    async generateThumbnail(file) {
        if (file.mimetype.startsWith('image/')) {
            console.log('Image thumbnail generation not implemented yet');
            return null;
        }
        if (file.mimetype.startsWith('video/')) {
            console.log('Video thumbnail generation not implemented yet');
            return null;
        }
        return null;
    }
    getFileTypeFromMime(mimeType) {
        if (mimeType.startsWith('image/'))
            return 'image';
        if (mimeType.startsWith('video/'))
            return 'video';
        if (mimeType === 'application/pdf')
            return 'pdf';
        return 'file';
    }
    async testConnection() {
        try {
            await this.s3.listObjectsV2({
                Bucket: this.bucketName,
                MaxKeys: 1
            }).promise();
            return true;
        }
        catch (error) {
            console.error('S3 Connection Test Failed:', error);
            return false;
        }
    }
};
exports.S3Service = S3Service;
exports.S3Service = S3Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3Service);
//# sourceMappingURL=s3.service.js.map