import { PostsService } from './posts.service';
export declare class AdminPostsController {
    private readonly postsService;
    constructor(postsService: PostsService);
    getTotalPosts(): Promise<{
        message: string;
        data: {
            totalPosts: number;
        };
    }>;
    getDailyPostMetrics(): Promise<{
        message: string;
        data: any[];
    }>;
    getMostLikedPosts(): Promise<{
        message: string;
        data: import("./entities/post.entity").Post[];
    }>;
    getMostViewedPosts(): Promise<{
        message: string;
        data: import("./entities/post.entity").Post[];
    }>;
    findOne(id: string): Promise<{
        message: string;
        data: import("./entities/post.entity").Post;
    }>;
    remove(id: string): Promise<{
        message: string;
        data: null;
    }>;
}
