import { Company } from '../../company/entities/company.entity';
export declare class Product {
    id: string;
    name: string;
    description: string;
    images: string[];
    price: number;
    minimumQuantity: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    company: Company;
    companyId: string;
}
