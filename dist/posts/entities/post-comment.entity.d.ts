import { Company } from '../../company/entities/company.entity';
import { Post } from './post.entity';
export declare class PostComment {
    id: string;
    companyId: string;
    postId: string;
    comment: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
    post: Post;
}
