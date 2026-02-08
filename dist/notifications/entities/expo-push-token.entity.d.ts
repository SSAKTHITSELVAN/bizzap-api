import { Company } from '../../company/entities/company.entity';
export declare class ExpoPushToken {
    id: string;
    companyId: string;
    token: string;
    deviceId?: string;
    platform?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    company?: Company;
}
