import { Company } from '../../company/entities/company.entity';
export declare class Follower {
    id: string;
    followerCompanyId: string;
    followedCompanyId: string;
    createdAt: Date;
    followerCompany: Company;
    followedCompany: Company;
}
