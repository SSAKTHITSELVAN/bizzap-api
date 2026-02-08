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
exports.FollowersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const followers_service_1 = require("./followers.service");
const follow_dto_1 = require("./dto/follow.dto");
const jwt_auth_guard_1 = require("../core/guards/jwt-auth.guard");
let FollowersController = class FollowersController {
    followersService;
    constructor(followersService) {
        this.followersService = followersService;
    }
    async follow(req, followDto) {
        return {
            message: 'Company followed successfully',
            data: await this.followersService.follow(req.user.companyId, followDto.companyId),
        };
    }
    async unfollow(req, companyId) {
        await this.followersService.unfollow(req.user.companyId, companyId);
        return {
            message: 'Company unfollowed successfully',
            data: null,
        };
    }
    async getFollowing(req) {
        return {
            message: 'Following companies retrieved successfully',
            data: await this.followersService.getFollowing(req.user.companyId),
        };
    }
    async getFollowers(req) {
        return {
            message: 'Followers retrieved successfully',
            data: await this.followersService.getFollowers(req.user.companyId),
        };
    }
    async checkFollowing(req, companyId) {
        return {
            message: 'Follow status retrieved successfully',
            data: {
                isFollowing: await this.followersService.isFollowing(req.user.companyId, companyId),
            },
        };
    }
};
exports.FollowersController = FollowersController;
__decorate([
    (0, common_1.Post)('follow'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Follow a company' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Company followed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Already following or cannot follow yourself' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, follow_dto_1.FollowDto]),
    __metadata("design:returntype", Promise)
], FollowersController.prototype, "follow", null);
__decorate([
    (0, common_1.Delete)('unfollow/:companyId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Unfollow a company' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company UUID to unfollow' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company unfollowed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not following this company' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FollowersController.prototype, "unfollow", null);
__decorate([
    (0, common_1.Get)('following'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get companies that authenticated company is following' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Following companies retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FollowersController.prototype, "getFollowing", null);
__decorate([
    (0, common_1.Get)('followers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get followers of authenticated company' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Followers retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FollowersController.prototype, "getFollowers", null);
__decorate([
    (0, common_1.Get)('check/:companyId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if authenticated company is following another company' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company UUID to check' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Follow status retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized - Invalid or missing token' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FollowersController.prototype, "checkFollowing", null);
exports.FollowersController = FollowersController = __decorate([
    (0, swagger_1.ApiTags)('Followers'),
    (0, common_1.Controller)('followers'),
    __metadata("design:paramtypes", [followers_service_1.FollowersService])
], FollowersController);
//# sourceMappingURL=followers.controller.js.map