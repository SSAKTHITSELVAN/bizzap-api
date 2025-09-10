// src/modules/followers/followers.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follower } from './entities/follower.entity';
import { Company } from '../company/entities/company.entity';

@Injectable()
export class FollowersService {
  constructor(
    @InjectRepository(Follower)
    private followerRepository: Repository<Follower>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  async follow(followerCompanyId: string, followedCompanyId: string): Promise<Follower> {
    if (followerCompanyId === followedCompanyId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if already following
    const existingFollow = await this.followerRepository.findOne({
      where: { followerCompanyId, followedCompanyId },
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this company');
    }

    // Check if followed company exists
    const followedCompany = await this.companyRepository.findOne({
      where: { id: followedCompanyId, isDeleted: false },
    });

    if (!followedCompany) {
      throw new NotFoundException('Company to follow not found');
    }

    const follow = this.followerRepository.create({
      followerCompanyId,
      followedCompanyId,
    });

    const savedFollow = await this.followerRepository.save(follow);

    // Update followers count
    await this.companyRepository.update(followedCompanyId, {
      followersCount: followedCompany.followersCount + 1,
    });

    return savedFollow;
  }

  async unfollow(followerCompanyId: string, followedCompanyId: string): Promise<void> {
    const follow = await this.followerRepository.findOne({
      where: { followerCompanyId, followedCompanyId },
    });

    if (!follow) {
      throw new NotFoundException('Not following this company');
    }

    await this.followerRepository.remove(follow);

    // Update followers count
    const followedCompany = await this.companyRepository.findOne({
      where: { id: followedCompanyId, isDeleted: false },
    });

    if (followedCompany) {
      await this.companyRepository.update(followedCompanyId, {
        followersCount: Math.max(0, followedCompany.followersCount - 1),
      });
    }
  }

  async getFollowing(companyId: string): Promise<Company[]> {
    const follows = await this.followerRepository.find({
      where: { followerCompanyId: companyId },
      relations: ['followedCompany'],
    });

    return follows.map(follow => follow.followedCompany);
  }

  async getFollowers(companyId: string): Promise<Company[]> {
    const follows = await this.followerRepository.find({
      where: { followedCompanyId: companyId },
      relations: ['followerCompany'],
    });

    return follows.map(follow => follow.followerCompany);
  }

  async isFollowing(followerCompanyId: string, followedCompanyId: string): Promise<boolean> {
    const follow = await this.followerRepository.findOne({
      where: { followerCompanyId, followedCompanyId },
    });

    return !!follow;
  }
}
