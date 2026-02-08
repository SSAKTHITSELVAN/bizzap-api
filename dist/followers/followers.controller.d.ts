import { FollowersService } from './followers.service';
import { FollowDto } from './dto/follow.dto';
export declare class FollowersController {
    private readonly followersService;
    constructor(followersService: FollowersService);
    follow(req: any, followDto: FollowDto): Promise<{
        message: string;
        data: import("./entities/follower.entity").Follower;
    }>;
    unfollow(req: any, companyId: string): Promise<{
        message: string;
        data: null;
    }>;
    getFollowing(req: any): Promise<{
        message: string;
        data: import("../company/entities/company.entity").Company[];
    }>;
    getFollowers(req: any): Promise<{
        message: string;
        data: import("../company/entities/company.entity").Company[];
    }>;
    checkFollowing(req: any, companyId: string): Promise<{
        message: string;
        data: {
            isFollowing: boolean;
        };
    }>;
}
