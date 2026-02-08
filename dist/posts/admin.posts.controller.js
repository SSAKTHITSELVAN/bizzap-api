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
exports.AdminPostsController = void 0;
const common_1 = require("@nestjs/common");
const posts_service_1 = require("./posts.service");
const swagger_1 = require("@nestjs/swagger");
let AdminPostsController = class AdminPostsController {
    postsService;
    constructor(postsService) {
        this.postsService = postsService;
    }
    async getTotalPosts() {
        return {
            message: 'Total posts count retrieved successfully',
            data: {
                totalPosts: await this.postsService.getTotalPosts(),
            },
        };
    }
    async getDailyPostMetrics() {
        return {
            message: 'Daily post count retrieved successfully',
            data: await this.postsService.getPostsByDate(),
        };
    }
    async getMostLikedPosts() {
        return {
            message: 'Most liked posts retrieved successfully',
            data: await this.postsService.getMostLikedPosts(),
        };
    }
    async getMostViewedPosts() {
        return {
            message: 'Most viewed posts retrieved successfully',
            data: await this.postsService.getMostViewedPosts(),
        };
    }
    async findOne(id) {
        return {
            message: 'Post retrieved successfully',
            data: await this.postsService.findOne(id),
        };
    }
    async remove(id) {
        await this.postsService.remove(id, '');
        return {
            message: 'Post deleted successfully',
            data: null,
        };
    }
};
exports.AdminPostsController = AdminPostsController;
__decorate([
    (0, common_1.Get)('metrics/total'),
    (0, swagger_1.ApiOperation)({ summary: 'Get total posts count (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Total posts count retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminPostsController.prototype, "getTotalPosts", null);
__decorate([
    (0, common_1.Get)('metrics/daily'),
    (0, swagger_1.ApiOperation)({ summary: 'Get post creation count per day (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Daily post count retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminPostsController.prototype, "getDailyPostMetrics", null);
__decorate([
    (0, common_1.Get)('metrics/most-liked'),
    (0, swagger_1.ApiOperation)({ summary: 'Get most liked posts (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Most liked posts retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminPostsController.prototype, "getMostLikedPosts", null);
__decorate([
    (0, common_1.Get)('metrics/most-viewed'),
    (0, swagger_1.ApiOperation)({ summary: 'Get most viewed posts (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Most viewed posts retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminPostsController.prototype, "getMostViewedPosts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get post by ID (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post retrieved successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPostsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete any post and associated S3 files (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Post UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post deleted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPostsController.prototype, "remove", null);
exports.AdminPostsController = AdminPostsController = __decorate([
    (0, swagger_1.ApiTags)('Admin-Posts'),
    (0, common_1.Controller)('admin/posts'),
    __metadata("design:paramtypes", [posts_service_1.PostsService])
], AdminPostsController);
//# sourceMappingURL=admin.posts.controller.js.map