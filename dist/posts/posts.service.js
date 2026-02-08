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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const post_entity_1 = require("./entities/post.entity");
const post_like_entity_1 = require("./entities/post-like.entity");
const post_comment_entity_1 = require("./entities/post-comment.entity");
const post_save_entity_1 = require("./entities/post-save.entity");
const s3_service_1 = require("../chat/s3.service");
let PostsService = class PostsService {
    postRepository;
    postLikeRepository;
    postCommentRepository;
    postSaveRepository;
    s3Service;
    constructor(postRepository, postLikeRepository, postCommentRepository, postSaveRepository, s3Service) {
        this.postRepository = postRepository;
        this.postLikeRepository = postLikeRepository;
        this.postCommentRepository = postCommentRepository;
        this.postSaveRepository = postSaveRepository;
        this.s3Service = s3Service;
    }
    async create(companyId, createPostDto) {
        const post = this.postRepository.create({
            content: createPostDto.content,
            companyId,
        });
        return this.postRepository.save(post);
    }
    async createWithMedia(companyId, createPostDto, images, video) {
        try {
            const hasImages = images && images.length > 0;
            const hasVideo = video && video !== undefined;
            if (hasImages && hasVideo) {
                throw new common_1.BadRequestException('You can upload either images or a video, not both together');
            }
            if (!hasImages && !hasVideo) {
                throw new common_1.BadRequestException('Please provide at least one image or a video');
            }
            let imageKeys = [];
            let videoKey;
            if (hasImages) {
                const uploadPromises = images.map(image => this.s3Service.uploadFile(image, 'posts-media/images'));
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
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new Error(`Failed to create post with media: ${error.message}`);
        }
    }
    async findAll(page = 1, limit = 10) {
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
    async getTopTenPosts() {
        const posts = await this.postRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.company', 'company')
            .where('post.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('post.isActive = :isActive', { isActive: true })
            .addSelect('(post.likesCount * 3 + post.commentsCount * 2 + post.sharesCount * 4 + post.viewsCount * 0.1)', 'engagement_score')
            .orderBy('engagement_score', 'DESC')
            .addOrderBy('post.createdAt', 'DESC')
            .limit(10)
            .getMany();
        return this.generateSignedUrlsForPosts(posts);
    }
    async findVideoPosts(page = 1, limit = 10) {
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
    async findByCompany(companyId) {
        const posts = await this.postRepository.find({
            where: { companyId, isDeleted: false },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        return this.generateSignedUrlsForPosts(posts);
    }
    async findOne(id) {
        const post = await this.postRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        post.viewsCount += 1;
        await this.postRepository.save(post);
        const [postWithUrls] = await this.generateSignedUrlsForPosts([post]);
        return postWithUrls;
    }
    async update(id, companyId, updatePostDto) {
        const post = await this.postRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (post.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only update your own posts');
        }
        Object.assign(post, updatePostDto);
        const updatedPost = await this.postRepository.save(post);
        const [postWithUrls] = await this.generateSignedUrlsForPosts([updatedPost]);
        return postWithUrls;
    }
    async remove(id, companyId) {
        const post = await this.postRepository.findOne({
            where: { id, isDeleted: false },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        if (companyId && post.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only delete your own posts');
        }
        try {
            if (post.images && post.images.length > 0) {
                await Promise.all(post.images.map(key => this.s3Service.deleteFile(key)));
            }
            if (post.video) {
                await this.s3Service.deleteFile(post.video);
            }
        }
        catch (error) {
            console.error(`Failed to delete media from S3: ${error.message}`);
        }
        await this.postRepository.update(id, { isDeleted: true });
    }
    async toggleLike(postId, companyId) {
        const post = await this.postRepository.findOne({
            where: { id: postId, isDeleted: false },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
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
        }
        else {
            const like = this.postLikeRepository.create({ postId, companyId });
            await this.postLikeRepository.save(like);
            await this.postRepository.update(postId, {
                likesCount: post.likesCount + 1,
            });
            return { liked: true, likesCount: post.likesCount + 1 };
        }
    }
    async toggleSave(postId, companyId) {
        const post = await this.postRepository.findOne({
            where: { id: postId, isDeleted: false },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
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
        }
        else {
            const save = this.postSaveRepository.create({ postId, companyId });
            await this.postSaveRepository.save(save);
            await this.postRepository.update(postId, {
                savesCount: post.savesCount + 1,
            });
            return { saved: true, savesCount: post.savesCount + 1 };
        }
    }
    async getSavedPosts(companyId, page = 1, limit = 10) {
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
    async addComment(postId, companyId, createCommentDto) {
        const post = await this.postRepository.findOne({
            where: { id: postId, isDeleted: false },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
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
            throw new common_1.NotFoundException('Comment could not be retrieved after creation');
        }
        await this.generateSignedUrlsForCompany(savedComment.company);
        return savedComment;
    }
    async getComments(postId) {
        const comments = await this.postCommentRepository.find({
            where: { postId, isDeleted: false },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        for (const comment of comments) {
            if (comment.company) {
                await this.generateSignedUrlsForCompany(comment.company);
            }
        }
        return comments;
    }
    async deleteComment(commentId, companyId) {
        const comment = await this.postCommentRepository.findOne({
            where: { id: commentId, isDeleted: false },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (comment.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only delete your own comments');
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
    async removeSavedPost(postId, companyId) {
        const post = await this.postRepository.findOne({
            where: { id: postId, isDeleted: false },
        });
        if (!post) {
            throw new common_1.NotFoundException('Post not found');
        }
        const existingSave = await this.postSaveRepository.findOne({
            where: { postId, companyId },
        });
        if (!existingSave) {
            throw new common_1.NotFoundException('Post is not in your saved posts');
        }
        await this.postSaveRepository.remove(existingSave);
        await this.postRepository.update(postId, {
            savesCount: Math.max(0, post.savesCount - 1),
        });
        return { removed: true, savesCount: Math.max(0, post.savesCount - 1) };
    }
    async getTotalPosts() {
        return this.postRepository.count({ where: { isDeleted: false } });
    }
    async getPostsByDate() {
        return this.postRepository
            .createQueryBuilder('post')
            .select("DATE(post.createdAt) as date")
            .addSelect("COUNT(*) as count")
            .where("post.isDeleted = :isDeleted", { isDeleted: false })
            .groupBy("date")
            .orderBy("date", "DESC")
            .getRawMany();
    }
    async getMostLikedPosts(limit = 10) {
        const posts = await this.postRepository.find({
            where: { isDeleted: false },
            order: { likesCount: 'DESC' },
            take: limit,
            relations: ['company'],
        });
        return this.generateSignedUrlsForPosts(posts);
    }
    async getMostViewedPosts(limit = 10) {
        const posts = await this.postRepository.find({
            where: { isDeleted: false },
            order: { viewsCount: 'DESC' },
            take: limit,
            relations: ['company'],
        });
        return this.generateSignedUrlsForPosts(posts);
    }
    async generateSignedUrlsForCompany(company) {
        if (!company)
            return;
        try {
            if (company.logo && this.s3Service.isS3Key(company.logo)) {
                company.logo = await this.s3Service.generateSignedUrl(company.logo, 3600);
            }
            if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
                company.userPhoto = await this.s3Service.generateSignedUrl(company.userPhoto, 3600);
            }
            if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
                company.coverImage = await this.s3Service.generateSignedUrl(company.coverImage, 3600);
            }
        }
        catch (error) {
            console.error(`Failed to generate signed URLs for company ${company.id}:`, error);
        }
    }
    async generateSignedUrlsForPosts(posts) {
        return Promise.all(posts.map(async (post) => {
            const postObj = { ...post };
            if (post.images && post.images.length > 0) {
                try {
                    postObj.images = await Promise.all(post.images.map(key => this.s3Service.generateSignedUrl(key, 3600)));
                }
                catch (error) {
                    console.error(`Failed to generate signed URLs for post ${post.id} images:`, error);
                }
            }
            if (post.video) {
                try {
                    postObj.video = await this.s3Service.generateSignedUrl(post.video, 3600);
                }
                catch (error) {
                    console.error(`Failed to generate signed URL for post ${post.id} video:`, error);
                }
            }
            if (postObj.company) {
                await this.generateSignedUrlsForCompany(postObj.company);
            }
            return postObj;
        }));
    }
};
exports.PostsService = PostsService;
exports.PostsService = PostsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(post_entity_1.Post)),
    __param(1, (0, typeorm_1.InjectRepository)(post_like_entity_1.PostLike)),
    __param(2, (0, typeorm_1.InjectRepository)(post_comment_entity_1.PostComment)),
    __param(3, (0, typeorm_1.InjectRepository)(post_save_entity_1.PostSave)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        s3_service_1.S3Service])
], PostsService);
//# sourceMappingURL=posts.service.js.map