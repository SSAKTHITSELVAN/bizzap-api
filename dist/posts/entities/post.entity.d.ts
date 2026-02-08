import { Company } from '../../company/entities/company.entity';
export declare class Post {
    id: string;
    content: string;
    images: string[];
    video: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    savesCount: number;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
    companyId: string;
}
