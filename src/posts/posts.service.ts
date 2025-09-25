import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(PostLike)
    private postLikeRepository: Repository<PostLike>,
    @InjectRepository(PostComment)
    private postCommentRepository: Repository<PostComment>,
  ) {}

  async create(companyId: string, createPostDto: CreatePostDto): Promise<Post> {
    const post = this.postRepository.create({
      ...createPostDto,
      companyId,
    });
    return this.postRepository.save(post);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ posts: Post[], total: number }> {
    const [posts, total] = await this.postRepository.findAndCount({
      where: { isDeleted: false, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { posts, total };
  }

  async findByCompany(companyId: string): Promise<Post[]> {
    return this.postRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Increment view count
    post.viewsCount += 1;
    await this.postRepository.save(post);
    
    return post;
  }

  async update(id: string, companyId: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    
    if (post.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    Object.assign(post, updatePostDto);
    return this.postRepository.save(post);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const post = await this.findOne(id);
    
    if (post.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.postRepository.update(id, { isDeleted: true });
  }

  async toggleLike(postId: string, companyId: string): Promise<{ liked: boolean, likesCount: number }> {
    const post = await this.findOne(postId);
    
    const existingLike = await this.postLikeRepository.findOne({
      where: { postId, companyId },
    });

    if (existingLike) {
      // Unlike the post
      await this.postLikeRepository.remove(existingLike);
      await this.postRepository.update(postId, {
        likesCount: post.likesCount - 1,
      });
      return { liked: false, likesCount: post.likesCount - 1 };
    } else {
      // Like the post
      const like = this.postLikeRepository.create({ postId, companyId });
      await this.postLikeRepository.save(like);
      await this.postRepository.update(postId, {
        likesCount: post.likesCount + 1,
      });
      return { liked: true, likesCount: post.likesCount + 1 };
    }
  }

  async addComment(postId: string, companyId: string, createCommentDto: CreateCommentDto): Promise<PostComment> {
    const post = await this.findOne(postId);
    
    const comment = this.postCommentRepository.create({
      postId,
      companyId,
      comment: createCommentDto.comment,
    });

    await this.postCommentRepository.save(comment);
    
    // Increment comments count
    await this.postRepository.update(postId, {
      commentsCount: post.commentsCount + 1,
    });

    const savedComment = await this.postCommentRepository.findOne({
      where: { id: comment.id },
      relations: ['company'],
    });

    if (!savedComment) {
      throw new NotFoundException('Comment could not be retrieved after creation');
    }

    return savedComment;
  }

  async getComments(postId: string): Promise<PostComment[]> {
    return this.postCommentRepository.find({
      where: { postId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteComment(commentId: string, companyId: string): Promise<void> {
    const comment = await this.postCommentRepository.findOne({
      where: { id: commentId, isDeleted: false },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.postCommentRepository.update(commentId, { isDeleted: true });
    
    // Decrement comments count
    const post = await this.findOne(comment.postId);
    await this.postRepository.update(comment.postId, {
      commentsCount: Math.max(0, post.commentsCount - 1),
    });
  }

  // Admin methods
  async getTotalPosts(): Promise<number> {
    return this.postRepository.count({ where: { isDeleted: false } });
  }

  async getPostsByDate(): Promise<any[]> {
    return this.postRepository
      .createQueryBuilder('post')
      .select("DATE(post.createdAt) as date")
      .addSelect("COUNT(*) as count")
      .where("post.isDeleted = :isDeleted", { isDeleted: false })
      .groupBy("date")
      .orderBy("date", "DESC")
      .getRawMany();
  }

  async getMostLikedPosts(limit: number = 10): Promise<Post[]> {
    return this.postRepository.find({
      where: { isDeleted: false },
      order: { likesCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
  }

  async getMostViewedPosts(limit: number = 10): Promise<Post[]> {
    return this.postRepository.find({
      where: { isDeleted: false },
      order: { viewsCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });
  }
}