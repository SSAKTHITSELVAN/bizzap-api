import { Company } from '../../company/entities/company.entity';
export declare class Lead {
    id: string;
    title: string;
    description: string;
    imageKey: string;
    imageUrl: string;
    imageName: string;
    imageSize: number;
    imageMimeType: string;
    budget: string;
    quantity: string;
    location: string;
    isActive: boolean;
    reasonForDeactivation?: string;
    consumedCount: number;
    viewCount: number;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
    companyId: string;
}
