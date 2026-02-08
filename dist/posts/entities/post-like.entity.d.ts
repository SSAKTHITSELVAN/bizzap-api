import { Company } from '../../company/entities/company.entity';
import { Post } from './post.entity';
export declare class PostLike {
    id: string;
    companyId: string;
    postId: string;
    likedAt: Date;
    company: Company;
    post: Post;
}
