import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
export declare class CompanyController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    getProfile(req: any): Promise<{
        message: string;
        data: any;
    }>;
    getLeadQuotaDetails(req: any): Promise<{
        message: string;
        data: import("./dto/lead-quota-details.dto").LeadQuotaDetailsDto;
    }>;
    getConsumedLeads(req: any): Promise<{
        message: string;
        data: any[];
    }>;
    findOne(id: string): Promise<{
        message: string;
        data: any;
    }>;
    updateProfile(req: any, updateCompanyDto: UpdateCompanyDto, files?: {
        userPhoto?: Express.Multer.File[];
        logo?: Express.Multer.File[];
        coverImage?: Express.Multer.File[];
    }): Promise<{
        message: string;
        data: any;
    }>;
}
