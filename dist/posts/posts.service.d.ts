import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { PostSave } from './entities/post-save.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { S3Service } from '../chat/s3.service';
export declare class PostsService {
    private postRepository;
    private postLikeRepository;
    private postCommentRepository;
    private postSaveRepository;
    private s3Service;
    constructor(postRepository: Repository<Post>, postLikeRepository: Repository<PostLike>, postCommentRepository: Repository<PostComment>, postSaveRepository: Repository<PostSave>, s3Service: S3Service);
    create(companyId: string, createPostDto: CreatePostDto): Promise<Post>;
    createWithMedia(companyId: string, createPostDto: CreatePostDto, images?: Express.Multer.File[], video?: Express.Multer.File): Promise<Post>;
    findAll(page?: number, limit?: number): Promise<{
        posts: Post[];
        total: number;
    }>;
    getTopTenPosts(): Promise<Post[]>;
    findVideoPosts(page?: number, limit?: number): Promise<{
        posts: Post[];
        total: number;
    }>;
    findByCompany(companyId: string): Promise<Post[]>;
    findOne(id: string): Promise<Post>;
    update(id: string, companyId: string, updatePostDto: UpdatePostDto): Promise<Post>;
    remove(id: string, companyId: string): Promise<void>;
    toggleLike(postId: string, companyId: string): Promise<{
        liked: boolean;
        likesCount: number;
    }>;
    toggleSave(postId: string, companyId: string): Promise<{
        saved: boolean;
        savesCount: number;
    }>;
    getSavedPosts(companyId: string, page?: number, limit?: number): Promise<{
        posts: Post[];
        total: number;
    }>;
    addComment(postId: string, companyId: string, createCommentDto: CreateCommentDto): Promise<PostComment>;
    getComments(postId: string): Promise<PostComment[]>;
    deleteComment(commentId: string, companyId: string): Promise<void>;
    removeSavedPost(postId: string, companyId: string): Promise<{
        removed: boolean;
        savesCount: number;
    }>;
    getTotalPosts(): Promise<number>;
    getPostsByDate(): Promise<any[]>;
    getMostLikedPosts(limit?: number): Promise<Post[]>;
    getMostViewedPosts(limit?: number): Promise<Post[]>;
    private generateSignedUrlsForCompany;
    private generateSignedUrlsForPosts;
}
