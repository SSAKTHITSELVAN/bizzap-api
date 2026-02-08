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
exports.PostsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const posts_service_1 = require("./posts.service");
const create_post_dto_1 = require("./dto/create-post.dto");
const update_post_dto_1 = require("./dto/update-post.dto");
const create_comment_dto_1 = require("./dto/create-comment.dto");
const jwt_auth_guard_1 = require("../core/guards/jwt-auth.guard");
let PostsController = class PostsController {
    postsService;
    constructor(postsService) {
        this.postsService = postsService;
    }
    async create(req, createPostDto) {
        return {
            message: 'Post created successfully',
            data: await this.postsService.create(req.user.companyId, createPostDto),
        };
    }
    async createWithMedia(req, files, createPostDto) {
        const hasImages = files?.images && files.images.length > 0;
        const hasVideo = files?.video && files.video.length > 0;
        if (hasImages && hasVideo) {
            throw new common_1.BadRequestException('You can upload either images or a video, not both together');
        }
        if (!hasImages && !hasVideo) {
            throw new common_1.BadRequestException('Please provide at least one image or a video');
        }
        if (hasImages && files.images) {
            for (const image of files.images) {
                if (!image.mimetype.startsWith('image/')) {
                    throw new common_1.BadRequestException('Only image files are allowed for images field');
                }
                if (image.size > 10 * 1024 * 1024) {
                    throw new common_1.BadRequestException('Each image must be less than 10MB');
                }
            }
        }
        if (hasVideo && files.video) {
            const video = files.video[0];
            if (!video.mimetype.startsWith('video/')) {
                throw new common_1.BadRequestException('Only video files are allowed for video field');
            }
            if (video.size > 100 * 1024 * 1024) {
                throw new common_1.BadRequestException('Video must be less than 100MB');
            }
        }
        return {
            message: 'Post created successfully',
            data: await this.postsService.createWithMedia(req.user.companyId, createPostDto, files.images, files.video?.[0]),
        };
    }
    async findAll(page = '1', limit = '10') {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const result = await this.postsService.findAll(pageNum, limitNum);
        return {
            message: 'Posts retrieved successfully',
            data: result.posts,
            pagination: {
                currentPage: pageNum,
                itemsPerPage: limitNum,
                totalItems: result.total,
                totalPages: Math.ceil(result.total / limitNum),
            },
        };
    }
    async getTopTenPosts() {
        return {
            message: 'Top 10 posts retrieved successfully',
            data: await this.postsService.getTopTenPosts(),
        };
    }
    async findVideoPosts(page = '1', limit = '10') {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const result = await this.postsService.findVideoPosts(pageNum, limitNum);
        return {
            message: 'Video posts retrieved successfully',
            data: result.posts,
            pagination: {
                currentPage: pageNum,
                itemsPerPage: limitNum,
                totalItems: result.total,
                totalPages: Math.ceil(result.total / limitNum),
            },
        };
    }
    async findMyPosts(req) {
        return {
            message: 'My posts retrieved successfully',
            data: await this.postsService.findByCompany(req.user.companyId),
        };
    }
    async findOne(id) {
        return {
            message: 'Post retrieved successfully',
            data: await this.postsService.findOne(id),
        };
    }
    async toggleLike(id, req) {
        const result = await this.postsService.toggleLike(id, req.user.companyId);
        return {
            message: result.liked ? 'Post liked successfully' : 'Post unliked successfully',
            data: result,
        };
    }
    async toggleSave(id, req) {
        const result = await this.postsService.toggleSave(id, req.user.companyId);
        return {
            message: result.saved ? 'Post saved successfully' : 'Post unsaved successfully',
            data: result,
        };
    }
    async getMySavedPosts(req, page = '1', limit = '10') {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const result = await this.postsService.getSavedPosts(req.user.companyId, pageNum, limitNum);
        return {
            message: 'Saved posts retrieved successfully',
            data: result.posts,
            pagination: {
                currentPage: pageNum,
                itemsPerPage: limitNum,
                totalItems: result.total,
                totalPages: Math.ceil(result.total / limitNum),
            },
        };
    }
    async removeSavedPost(postId, req) {
        const result = await this.postsService.removeSavedPost(postId, req.user.companyId);
        return {
            message: 'Post removed from saved posts successfully',
            data: result,
        };
    }
    async addComment(id, req, createCommentDto) {
        return {
            message: 'Comment added successfully',
            data: await this.postsService.addComment(id, req.user.companyId, createCommentDto),
        };
    }
    async getComments(id) {
        return {
            message: 'Comments retrieved successfully',
            data: await this.postsService.getComments(id),
        };
    }
    async deleteComment(commentId, req) {
        await this.postsService.deleteComment(commentId, req.user.companyId);
        return {
            message: 'Comment deleted successfully',
            data: null,
        };
    }
    async update(id, req, updatePostDto) {
        return {
            message: 'Post updated successfully',
            data: await this.postsService.update(id, req.user.companyId, updatePostDto),
        };
    }
    async remove(id, req) {
        await this.postsService.remove(id, req.user.companyId);
        return {
            message: 'Post deleted successfully',
            data: null,
        };
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a text-only post (no media)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Post created successfully' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_post_dto_1.CreatePostDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('with-media'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'images', maxCount: 5 },
        { name: 'video', maxCount: 1 },
    ])),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a post with EITHER images OR video (not both)',
        description: 'Upload either multiple images (up to 5) OR a single video with text content. Cannot upload both.'
    }),
    (0, swagger_1.ApiBody)({
        description: 'Post with media files (EITHER images OR video, not both)',
        schema: {
            type: 'object',
            properties: {
                content: { type: 'string', example: 'Check out our latest update! 🚀' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Up to 5 images (10MB each) - Use EITHER images OR video',
                },
                video: {
                    type: 'string',
                    format: 'binary',
                    description: 'Single video file (100MB max) - Use EITHER images OR video',
                },
            },
            required: ['content'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Post with media created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid file type, size, or both images and video provided' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, create_post_dto_1.CreatePostDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createWithMedia", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all active posts with pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Items per page (default: 10)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Posts retrieved successfully' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('top-ten'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top 10 posts by engagement (public)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Top 10 posts retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getTopTenPosts", null);
__decorate([
    (0, common_1.Get)('videos'),
    (0, swagger_1.ApiOperation)({ summary: 'Get posts that contain videos only' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Items per page (default: 10)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Video posts retrieved successfully' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findVideoPosts", null);
__decorate([
    (0, common_1.Get)('my-posts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get authenticated company posts' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'My posts retrieved successfully' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findMyPosts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get post by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post retrieved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle like on a post' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post like toggled successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "toggleLike", null);
__decorate([
    (0, common_1.Post)(':id/save'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle save on a post' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post save toggled successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "toggleSave", null);
__decorate([
    (0, common_1.Get)('saved/my-saved-posts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all saved posts by authenticated user' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Items per page (default: 10)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Saved posts retrieved successfully' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getMySavedPosts", null);
__decorate([
    (0, common_1.Delete)('saved/:postId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a post from saved posts' }),
    (0, swagger_1.ApiParam)({ name: 'postId', description: 'Post UUID to unsave' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post removed from saved posts successfully' }),
    __param(0, (0, common_1.Param)('postId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "removeSavedPost", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Add comment to a post' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Comment added successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_comment_dto_1.CreateCommentDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "addComment", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comments for a post' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comments retrieved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Delete)('comments/:commentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a comment' }),
    (0, swagger_1.ApiParam)({ name: 'commentId', description: 'Comment UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment deleted successfully' }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Update post content (text only - no media changes)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_post_dto_1.UpdatePostDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a post (and associated S3 files)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post deleted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "remove", null);
exports.PostsController = PostsController = __decorate([
    (0, swagger_1.ApiTags)('Posts'),
    (0, common_1.Controller)('posts'),
    __metadata("design:paramtypes", [posts_service_1.PostsService])
], PostsController);
//# sourceMappingURL=posts.controller.js.map