import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { Post } from './post.entity';

@Entity('post_likes')
@Unique(['companyId', 'postId']) // Prevent duplicate likes
export class PostLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  postId: string;

  @CreateDateColumn()
  likedAt: Date;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Post)
  @JoinColumn({ name: 'postId' })
  post: Post;
}