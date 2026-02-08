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
exports.FollowersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const follower_entity_1 = require("./entities/follower.entity");
const company_entity_1 = require("../company/entities/company.entity");
let FollowersService = class FollowersService {
    followerRepository;
    companyRepository;
    constructor(followerRepository, companyRepository) {
        this.followerRepository = followerRepository;
        this.companyRepository = companyRepository;
    }
    async follow(followerCompanyId, followedCompanyId) {
        if (followerCompanyId === followedCompanyId) {
            throw new common_1.BadRequestException('Cannot follow yourself');
        }
        const existingFollow = await this.followerRepository.findOne({
            where: { followerCompanyId, followedCompanyId },
        });
        if (existingFollow) {
            throw new common_1.BadRequestException('Already following this company');
        }
        const followedCompany = await this.companyRepository.findOne({
            where: { id: followedCompanyId, isDeleted: false },
        });
        if (!followedCompany) {
            throw new common_1.NotFoundException('Company to follow not found');
        }
        const follow = this.followerRepository.create({
            followerCompanyId,
            followedCompanyId,
        });
        const savedFollow = await this.followerRepository.save(follow);
        await this.companyRepository.update(followedCompanyId, {
            followersCount: followedCompany.followersCount + 1,
        });
        return savedFollow;
    }
    async unfollow(followerCompanyId, followedCompanyId) {
        const follow = await this.followerRepository.findOne({
            where: { followerCompanyId, followedCompanyId },
        });
        if (!follow) {
            throw new common_1.NotFoundException('Not following this company');
        }
        await this.followerRepository.remove(follow);
        const followedCompany = await this.companyRepository.findOne({
            where: { id: followedCompanyId, isDeleted: false },
        });
        if (followedCompany) {
            await this.companyRepository.update(followedCompanyId, {
                followersCount: Math.max(0, followedCompany.followersCount - 1),
            });
        }
    }
    async getFollowing(companyId) {
        const follows = await this.followerRepository.find({
            where: { followerCompanyId: companyId },
            relations: ['followedCompany'],
        });
        return follows.map(follow => follow.followedCompany);
    }
    async getFollowers(companyId) {
        const follows = await this.followerRepository.find({
            where: { followedCompanyId: companyId },
            relations: ['followerCompany'],
        });
        return follows.map(follow => follow.followerCompany);
    }
    async isFollowing(followerCompanyId, followedCompanyId) {
        const follow = await this.followerRepository.findOne({
            where: { followerCompanyId, followedCompanyId },
        });
        return !!follow;
    }
};
exports.FollowersService = FollowersService;
exports.FollowersService = FollowersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(follower_entity_1.Follower)),
    __param(1, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], FollowersService);
//# sourceMappingURL=followers.service.js.map