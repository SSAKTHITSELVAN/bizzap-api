import { Repository } from 'typeorm';
import { Follower } from './entities/follower.entity';
import { Company } from '../company/entities/company.entity';
export declare class FollowersService {
    private followerRepository;
    private companyRepository;
    constructor(followerRepository: Repository<Follower>, companyRepository: Repository<Company>);
    follow(followerCompanyId: string, followedCompanyId: string): Promise<Follower>;
    unfollow(followerCompanyId: string, followedCompanyId: string): Promise<void>;
    getFollowing(companyId: string): Promise<Company[]>;
    getFollowers(companyId: string): Promise<Company[]>;
    isFollowing(followerCompanyId: string, followedCompanyId: string): Promise<boolean>;
}
