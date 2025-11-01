// src/chat/services/s3.service.ts - EXTENDED VERSION
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export enum AssetType {
  COMPANY_LOGO = 'company-logos',
  USER_PHOTO = 'user-photos',
  COVER_IMAGE = 'cover-images',
  CHAT_FILE = 'chat-files',
}

@Injectable()
export class S3Service {
  private s3: S3;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3 = new S3({
      region: this.configService.get<string>('AWS_REGION'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    });
    
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not configured in environment variables');
    }
    this.bucketName = bucketName;
  }

  /**
   * Upload file to S3 with specified folder
   * @param file - Multer file object
   * @param folder - S3 folder path or AssetType enum
   * @returns Object with S3 key, size, and mimeType
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'chat-files'): Promise<{
    url: string;
    key: string;
    size: number;
    mimeType: string;
  }> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
    
    const uploadParams = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private', // Files are private, access via signed URLs
    };

    try {
      const result = await this.s3.upload(uploadParams).promise();
      
      return {
        url: result.Location,
        key: fileName,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Upload company logo to S3
   * Validates image file and enforces size limits
   */
  async uploadCompanyLogo(file: Express.Multer.File): Promise<string> {
    this.validateImageFile(file);
    const result = await this.uploadFile(file, AssetType.COMPANY_LOGO);
    return result.key; // Return S3 key, not full URL
  }

  /**
   * Upload user photo to S3
   */
  async uploadUserPhoto(file: Express.Multer.File): Promise<string> {
    this.validateImageFile(file);
    const result = await this.uploadFile(file, AssetType.USER_PHOTO);
    return result.key;
  }

  /**
   * Upload cover image to S3
   */
  async uploadCoverImage(file: Express.Multer.File): Promise<string> {
    this.validateImageFile(file);
    const result = await this.uploadFile(file, AssetType.COVER_IMAGE);
    return result.key;
  }

  /**
   * Validate that file is an image and within size limits
   */
  private validateImageFile(file: Express.Multer.File): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed');
    }

    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }
  }

  /**
   * Generate signed URL for private S3 files
   * @param key - S3 key (path)
   * @param expiresIn - Expiration time in seconds (default 1 hour)
   */
  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return this.s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
      });
    } catch (error) {
      console.error('S3 Signed URL Error:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
    } catch (error) {
      console.error('S3 Delete Error:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Check if a string is an S3 key (not a full URL)
   * S3 keys follow pattern: folder/uuid.extension
   */
  isS3Key(path: string): boolean {
    if (!path) return false;
    
    // If it's a full URL (http/https), it's not an S3 key
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return false;
    }
    
    // Check if it matches our S3 key pattern: folder/uuid.ext
    const s3KeyPattern = /^(company-logos|user-photos|cover-images|chat-files)\/.+\..+$/;
    return s3KeyPattern.test(path);
  }

  /**
   * Generate signed URL if path is S3 key, otherwise return as-is
   * This ensures backward compatibility with existing URL strings
   */
  async getAccessibleUrl(path: string | null | undefined, expiresIn: number = 3600): Promise<string | null> {
    if (!path) return null;
    
    if (this.isS3Key(path)) {
      try {
        return await this.generateSignedUrl(path, expiresIn);
      } catch (error) {
        console.error(`Failed to generate signed URL for ${path}:`, error);
        return null;
      }
    }
    
    // Return existing URL as-is (backward compatibility)
    return path;
  }

  async generateThumbnail(file: Express.Multer.File): Promise<string | null> {
    // For now, return null - you can implement thumbnail generation later
    // This could involve Sharp for images or FFmpeg for videos
    
    if (file.mimetype.startsWith('image/')) {
      // TODO: Implement image thumbnail generation using Sharp
      console.log('Image thumbnail generation not implemented yet');
      return null;
    }
    
    if (file.mimetype.startsWith('video/')) {
      // TODO: Implement video thumbnail generation using FFmpeg
      console.log('Video thumbnail generation not implemented yet');
      return null;
    }
    
    return null;
  }

  getFileTypeFromMime(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'file';
  }

  // Utility method to check if S3 connection is working
  async testConnection(): Promise<boolean> {
    try {
      await this.s3.listObjectsV2({
        Bucket: this.bucketName,
        MaxKeys: 1
      }).promise();
      return true;
    } catch (error) {
      console.error('S3 Connection Test Failed:', error);
      return false;
    }
  }
}