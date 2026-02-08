import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    searchAll(query: string, companyPage: number, companyLimit: number, leadPage: number, leadLimit: number, productPage: number, productLimit: number): Promise<{
        message: string;
        data: {
            companies: import("./search.service").PaginatedResult<import("../company/entities/company.entity").Company>;
            leads: import("./search.service").PaginatedResult<import("../leads/entities/lead.entity").Lead>;
            products: import("./search.service").PaginatedResult<import("../products/entities/product.entity").Product>;
        };
    }>;
    searchCompanies(query: string, page: number, limit: number): Promise<{
        message: string;
        data: import("./search.service").PaginatedResult<import("../company/entities/company.entity").Company>;
    }>;
    searchLeads(query: string, page: number, limit: number): Promise<{
        message: string;
        data: import("./search.service").PaginatedResult<import("../leads/entities/lead.entity").Lead>;
    }>;
    searchProducts(query: string, page: number, limit: number): Promise<{
        message: string;
        data: import("./search.service").PaginatedResult<import("../products/entities/product.entity").Product>;
    }>;
}
