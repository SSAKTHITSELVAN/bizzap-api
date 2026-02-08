import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
export declare class PostsController {
    private readonly postsService;
    constructor(postsService: PostsService);
    create(req: any, createPostDto: CreatePostDto): Promise<{
        message: string;
        data: import("./entities/post.entity").Post;
    }>;
    createWithMedia(req: any, files: {
        images?: Express.Multer.File[];
        video?: Express.Multer.File[];
    }, createPostDto: CreatePostDto): Promise<{
        message: string;
        data: import("./entities/post.entity").Post;
    }>;
    findAll(page?: string, limit?: string): Promise<{
        message: string;
        data: import("./entities/post.entity").Post[];
        pagination: {
            currentPage: number;
            itemsPerPage: number;
            totalItems: number;
            totalPages: number;
        };
    }>;
    getTopTenPosts(): Promise<{
        message: string;
        data: import("./entities/post.entity").Post[];
    }>;
    findVideoPosts(page?: string, limit?: string): Promise<{
        message: string;
        data: import("./entities/post.entity").Post[];
        pagination: {
            currentPage: number;
            itemsPerPage: number;
            totalItems: number;
            totalPages: number;
        };
    }>;
    findMyPosts(req: any): Promise<{
        message: string;
        data: import("./entities/post.entity").Post[];
    }>;
    findOne(id: string): Promise<{
        message: string;
        data: import("./entities/post.entity").Post;
    }>;
    toggleLike(id: string, req: any): Promise<{
        message: string;
        data: {
            liked: boolean;
            likesCount: number;
        };
    }>;
    toggleSave(id: string, req: any): Promise<{
        message: string;
        data: {
            saved: boolean;
            savesCount: number;
        };
    }>;
    getMySavedPosts(req: any, page?: string, limit?: string): Promise<{
        message: string;
        data: import("./entities/post.entity").Post[];
        pagination: {
            currentPage: number;
            itemsPerPage: number;
            totalItems: number;
            totalPages: number;
        };
    }>;
    removeSavedPost(postId: string, req: any): Promise<{
        message: string;
        data: {
            removed: boolean;
            savesCount: number;
        };
    }>;
    addComment(id: string, req: any, createCommentDto: CreateCommentDto): Promise<{
        message: string;
        data: import("./entities/post-comment.entity").PostComment;
    }>;
    getComments(id: string): Promise<{
        message: string;
        data: import("./entities/post-comment.entity").PostComment[];
    }>;
    deleteComment(commentId: string, req: any): Promise<{
        message: string;
        data: null;
    }>;
    update(id: string, req: any, updatePostDto: UpdatePostDto): Promise<{
        message: string;
        data: import("./entities/post.entity").Post;
    }>;
    remove(id: string, req: any): Promise<{
        message: string;
        data: null;
    }>;
}
