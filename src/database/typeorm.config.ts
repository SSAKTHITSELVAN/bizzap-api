// src/database/typeorm.config.ts - Fixed with SSL
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';
import { Follower } from '../followers/entities/follower.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { Chat } from '../chat/entities/chat.entity';
import { Post } from '../posts/entities/post.entity';
import { PostLike } from '../posts/entities/post-like.entity';
import { PostComment } from '../posts/entities/post-comment.entity';
import { PostSave } from '../posts/entities/post-save.entity';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '0.00',
  database: process.env.DATABASE_NAME || 'bizzap_db',
  entities: [
    Company,
    Lead,
    Product,
    Follower,
    ConsumedLead,
    Chat,
    Post,
    PostLike,
    PostComment,
    PostSave,
  ],
  synchronize: true,
  logging: false,
  ssl: {
    rejectUnauthorized: false
  },
};