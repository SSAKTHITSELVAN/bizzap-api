import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostSave } from './entities/post-save.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { S3Service } from '../chat/s3.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(PostLike)
    private postLikeRepository: Repository<PostLike>,
    @InjectRepository(PostComment)
    private postCommentRepository: Repository<PostComment>,
    @InjectRepository(PostSave)
    private postSaveRepository: Repository<PostSave>,
    private s3Service: S3Service,
  ) {}

  async create(companyId: string, createPostDto: CreatePostDto): Promise<Post> {
    const post = this.postRepository.create({
      content: createPostDto.content,
      companyId,
    });
    return this.postRepository.save(post);
  }

  async createWithMedia(
    companyId: string,
    createPostDto: CreatePostDto,
    images?: Express.Multer.File[],
    video?: Express.Multer.File
  ): Promise<Post> {
    try {
      const hasImages = images && images.length > 0;
      const hasVideo = video && video !== undefined;

      if (hasImages && hasVideo) {
        throw new BadRequestException('You can upload either images or a video, not both together');
      }

      if (!hasImages && !hasVideo) {
        throw new BadRequestException('Please provide at least one image or a video');
      }

      let imageKeys: string[] = [];
      let videoKey: string | undefined;

      if (hasImages) {
        const uploadPromises = images.map(image => 
          this.s3Service.uploadFile(image, 'posts-media/images')
        );
        const uploadResults = await Promise.all(uploadPromises);
        imageKeys = uploadResults.map(result => result.key);
      }

      if (hasVideo) {
        const videoResult = await this.s3Service.uploadFile(video, 'posts-media/videos');
        videoKey = videoResult.key;
      }

      const post = this.postRepository.create({
        content: createPostDto.content,
        companyId,
        images: imageKeys.length > 0 ? imageKeys : undefined,
        video: videoKey,
      });

      return this.postRepository.save(post);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Failed to create post with media: ${error.message}`);
    }
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ posts: Post[], total: number }> {
    const [posts, total] = await this.postRepository.findAndCount({
      where: { isDeleted: false, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const postsWithUrls = await this.generateSignedUrlsForPosts(posts);
    return { posts: postsWithUrls, total };
  }

  async getTopTenPosts(): Promise<Post[]> {
    const posts = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.company', 'company')
      .where('post.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('post.isActive = :isActive', { isActive: true })
      .addSelect(
        '(post.likesCount * 3 + post.commentsCount * 2 + post.sharesCount * 4 + post.viewsCount * 0.1)',
        'engagement_score'
      )
      .orderBy('engagement_score', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .limit(10)
      .getMany();

    return this.generateSignedUrlsForPosts(posts);
  }

  async findVideoPosts(page: number = 1, limit: number = 10): Promise<{ posts: Post[], total: number }> {
    const queryBuilder = this.postRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.company', 'company')
      .where('post.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('post.isActive = :isActive', { isActive: true })
      .andWhere('post.video IS NOT NULL')
      .andWhere("post.video != ''")
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [posts, total] = await queryBuilder.getManyAndCount();
    const postsWithUrls = await this.generateSignedUrlsForPosts(posts);
    return { posts: postsWithUrls, total };
  }

  async findByCompany(companyId: string): Promise<Post[]> {
    const posts = await this.postRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    return this.generateSignedUrlsForPosts(posts);
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });
    
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    post.viewsCount += 1;
    await this.postRepository.save(post);
    
    const [postWithUrls] = await this.generateSignedUrlsForPosts([post]);
    return postWithUrls;
  }

  async update(id: string, companyId: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    if (post.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    Object.assign(post, updatePostDto);
    const updatedPost = await this.postRepository.save(post);
    
    const [postWithUrls] = await this.generateSignedUrlsForPosts([updatedPost]);
    return postWithUrls;
  }

  async remove(id: string, companyId: string): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    if (companyId && post.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    try {
      if (post.images && post.images.length > 0) {
        await Promise.all(post.images.map(key => this.s3Service.deleteFile(key)));
      }

      if (post.video) {
        await this.s3Service.deleteFile(post.video);
      }
    } catch (error) {
      console.error(`Failed to delete media from S3: ${error.message}`);
    }

    await this.postRepository.update(id, { isDeleted: true });
  }

  async toggleLike(postId: string, companyId: string): Promise<{ liked: boolean, likesCount: number }> {
    const post = await this.postRepository.findOne({
      where: { id: postId, isDeleted: false },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    const existingLike = await this.postLikeRepository.findOne({
      where: { postId, companyId },
    });

    if (existingLike) {
      await this.postLikeRepository.remove(existingLike);
      await this.postRepository.update(postId, {
        likesCount: post.likesCount - 1,
      });
      return { liked: false, likesCount: post.likesCount - 1 };
    } else {
      const like = this.postLikeRepository.create({ postId, companyId });
      await this.postLikeRepository.save(like);
      await this.postRepository.update(postId, {
        likesCount: post.likesCount + 1,
      });
      return { liked: true, likesCount: post.likesCount + 1 };
    }
  }

  async toggleSave(postId: string, companyId: string): Promise<{ saved: boolean, savesCount: number }> {
    const post = await this.postRepository.findOne({
      where: { id: postId, isDeleted: false },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    const existingSave = await this.postSaveRepository.findOne({
      where: { postId, companyId },
    });

    if (existingSave) {
      await this.postSaveRepository.remove(existingSave);
      await this.postRepository.update(postId, {
        savesCount: post.savesCount - 1,
      });
      return { saved: false, savesCount: post.savesCount - 1 };
    } else {
      const save = this.postSaveRepository.create({ postId, companyId });
      await this.postSaveRepository.save(save);
      await this.postRepository.update(postId, {
        savesCount: post.savesCount + 1,
      });
      return { saved: true, savesCount: post.savesCount + 1 };
    }
  }

  async getSavedPosts(companyId: string, page: number = 1, limit: number = 10): Promise<{ posts: Post[], total: number }> {
    const queryBuilder = this.postSaveRepository
      .createQueryBuilder('postSave')
      .leftJoinAndSelect('postSave.post', 'post')
      .leftJoinAndSelect('post.company', 'company')
      .where('postSave.companyId = :companyId', { companyId })
      .andWhere('post.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('post.isActive = :isActive', { isActive: true })
      .orderBy('postSave.savedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [savedPosts, total] = await queryBuilder.getManyAndCount();
    const posts = savedPosts.map(savedPost => savedPost.post);

    const postsWithUrls = await this.generateSignedUrlsForPosts(posts);
    return { posts: postsWithUrls, total };
  }

  async addComment(postId: string, companyId: string, createCommentDto: CreateCommentDto): Promise<PostComment> {
    const post = await this.postRepository.findOne({
      where: { id: postId, isDeleted: false },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    
    const comment = this.postCommentRepository.create({
      postId,
      companyId,
      comment: createCommentDto.comment,
    });

    await this.postCommentRepository.save(comment);
    
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

    // Generate signed URLs for company assets in the comment
    await this.generateSignedUrlsForCompany(savedComment.company);

    return savedComment;
  }

  async getComments(postId: string): Promise<PostComment[]> {
    const comments = await this.postCommentRepository.find({
      where: { postId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    // Generate signed URLs for each comment's company assets
    for (const comment of comments) {
      if (comment.company) {
        await this.generateSignedUrlsForCompany(comment.company);
      }
    }

    return comments;
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
    
    const post = await this.postRepository.findOne({
      where: { id: comment.postId },
    });

    if (post) {
      await this.postRepository.update(comment.postId, {
        commentsCount: Math.max(0, post.commentsCount - 1),
      });
    }
  }

  async removeSavedPost(postId: string, companyId: string): Promise<{ removed: boolean, savesCount: number }> {
    const post = await this.postRepository.findOne({
      where: { id: postId, isDeleted: false },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingSave = await this.postSaveRepository.findOne({
      where: { postId, companyId },
    });

    if (!existingSave) {
      throw new NotFoundException('Post is not in your saved posts');
    }

    await this.postSaveRepository.remove(existingSave);
    await this.postRepository.update(postId, {
      savesCount: Math.max(0, post.savesCount - 1),
    });

    return { removed: true, savesCount: Math.max(0, post.savesCount - 1) };
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
    const posts = await this.postRepository.find({
      where: { isDeleted: false },
      order: { likesCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });

    return this.generateSignedUrlsForPosts(posts);
  }

  async getMostViewedPosts(limit: number = 10): Promise<Post[]> {
    const posts = await this.postRepository.find({
      where: { isDeleted: false },
      order: { viewsCount: 'DESC' },
      take: limit,
      relations: ['company'],
    });

    return this.generateSignedUrlsForPosts(posts);
  }

  /**
   * 🔧 FIXED: Generate signed URLs for company assets
   * This helper method generates signed URLs for company logo, userPhoto, and coverImage
   */
  private async generateSignedUrlsForCompany(company: any): Promise<void> {
    if (!company) return;

    try {
      // Generate signed URL for company logo
      if (company.logo && this.s3Service.isS3Key(company.logo)) {
        company.logo = await this.s3Service.generateSignedUrl(company.logo, 3600);
      }

      // Generate signed URL for user photo
      if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
        company.userPhoto = await this.s3Service.generateSignedUrl(company.userPhoto, 3600);
      }

      // Generate signed URL for cover image
      if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
        company.coverImage = await this.s3Service.generateSignedUrl(company.coverImage, 3600);
      }
    } catch (error) {
      console.error(`Failed to generate signed URLs for company ${company.id}:`, error);
      // Don't throw - continue with S3 keys if signed URL generation fails
    }
  }

  /**
   * 🔧 FIXED: Generate signed URLs for posts AND company assets
   * Now includes company logo, userPhoto, and coverImage signed URLs
   */
  private async generateSignedUrlsForPosts(posts: Post[]): Promise<Post[]> {
    return Promise.all(
      posts.map(async (post) => {
        const postObj = { ...post };

        // Generate signed URLs for post media (images and video)
        if (post.images && post.images.length > 0) {
          try {
            postObj.images = await Promise.all(
              post.images.map(key => this.s3Service.generateSignedUrl(key, 3600))
            );
          } catch (error) {
            console.error(`Failed to generate signed URLs for post ${post.id} images:`, error);
          }
        }

        if (post.video) {
          try {
            postObj.video = await this.s3Service.generateSignedUrl(post.video, 3600);
          } catch (error) {
            console.error(`Failed to generate signed URL for post ${post.id} video:`, error);
          }
        }

        // 🆕 Generate signed URLs for company assets
        if (postObj.company) {
          await this.generateSignedUrlsForCompany(postObj.company);
        }

        return postObj;
      })
    );
  }
}