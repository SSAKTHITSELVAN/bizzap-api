import { Company } from '../../company/entities/company.entity';
import { Post } from './post.entity';
export declare class PostSave {
    id: string;
    companyId: string;
    postId: string;
    savedAt: Date;
    company: Company;
    post: Post;
}
