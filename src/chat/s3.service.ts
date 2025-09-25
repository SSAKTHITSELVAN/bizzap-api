// src/chat/services/s3.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

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