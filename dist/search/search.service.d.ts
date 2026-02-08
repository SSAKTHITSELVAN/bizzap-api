import { Repository } from 'typeorm';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';
import { S3Service } from '../chat/s3.service';
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}
export declare class SearchService {
    private companyRepository;
    private leadRepository;
    private productRepository;
    private s3Service;
    constructor(companyRepository: Repository<Company>, leadRepository: Repository<Lead>, productRepository: Repository<Product>, s3Service: S3Service);
    private generateSignedUrlsForCompany;
    private generateSignedUrlsForCompanies;
    searchCompanies(query: string, page?: number, limit?: number): Promise<PaginatedResult<Company>>;
    searchLeads(query: string, page?: number, limit?: number): Promise<PaginatedResult<Lead>>;
    searchProducts(query: string, page?: number, limit?: number): Promise<PaginatedResult<Product>>;
    searchAll(query: string, companyPage?: number, companyLimit?: number, leadPage?: number, leadLimit?: number, productPage?: number, productLimit?: number): Promise<{
        companies: PaginatedResult<Company>;
        leads: PaginatedResult<Lead>;
        products: PaginatedResult<Product>;
    }>;
}
