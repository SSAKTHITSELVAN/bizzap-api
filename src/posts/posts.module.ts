import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { AdminPostsController } from './admin.posts.controller';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostSave } from './entities/post-save.entity';
import { S3Service } from '../chat/s3.service';
import * as multer from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostLike, PostComment, PostSave]),
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB for videos
      },
    }),
  ],
  controllers: [PostsController, AdminPostsController],
  providers: [PostsService, S3Service],
  exports: [PostsService],
})
export class PostsModule {}