"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const company_entity_1 = require("../company/entities/company.entity");
const lead_entity_1 = require("../leads/entities/lead.entity");
const product_entity_1 = require("../products/entities/product.entity");
const s3_service_1 = require("../chat/s3.service");
let SearchService = class SearchService {
    companyRepository;
    leadRepository;
    productRepository;
    s3Service;
    constructor(companyRepository, leadRepository, productRepository, s3Service) {
        this.companyRepository = companyRepository;
        this.leadRepository = leadRepository;
        this.productRepository = productRepository;
        this.s3Service = s3Service;
    }
    async generateSignedUrlsForCompany(company) {
        if (!company)
            return;
        try {
            if (company.logo && this.s3Service.isS3Key(company.logo)) {
                company.logo = await this.s3Service.generateSignedUrl(company.logo, 3600);
            }
            if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
                company.userPhoto = await this.s3Service.generateSignedUrl(company.userPhoto, 3600);
            }
            if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
                company.coverImage = await this.s3Service.generateSignedUrl(company.coverImage, 3600);
            }
        }
        catch (error) {
            console.error(`Failed to generate signed URLs for company ${company.id}:`, error);
        }
    }
    async generateSignedUrlsForCompanies(companies) {
        for (const company of companies) {
            await this.generateSignedUrlsForCompany(company);
        }
        return companies;
    }
    async searchCompanies(query, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.companyRepository.findAndCount({
            where: [
                { companyName: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
                { description: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
                { gstNumber: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
                { category: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
                { about: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
            ],
            take: limit,
            skip: skip,
        });
        const companiesWithUrls = await this.generateSignedUrlsForCompanies(data);
        return { data: companiesWithUrls, total, page, limit };
    }
    async searchLeads(query, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.leadRepository.findAndCount({
            where: [
                { title: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
                { description: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
                { location: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
            ],
            relations: ['company'],
            take: limit,
            skip: skip,
            order: { createdAt: 'DESC' },
        });
        for (const lead of data) {
            if (lead.company) {
                await this.generateSignedUrlsForCompany(lead.company);
            }
        }
        return { data, total, page, limit };
    }
    async searchProducts(query, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.productRepository.findAndCount({
            where: [
                { name: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
                { description: (0, typeorm_2.Like)(`%${query}%`), isDeleted: false },
            ],
            relations: ['company'],
            take: limit,
            skip: skip,
            order: { createdAt: 'DESC' },
        });
        for (const product of data) {
            if (product.company) {
                await this.generateSignedUrlsForCompany(product.company);
            }
        }
        return { data, total, page, limit };
    }
    async searchAll(query, companyPage = 1, companyLimit = 10, leadPage = 1, leadLimit = 20, productPage = 1, productLimit = 20) {
        const [companies, leads, products] = await Promise.all([
            this.searchCompanies(query, companyPage, companyLimit),
            this.searchLeads(query, leadPage, leadLimit),
            this.searchProducts(query, productPage, productLimit),
        ]);
        return { companies, leads, products };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __param(1, (0, typeorm_1.InjectRepository)(lead_entity_1.Lead)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        s3_service_1.S3Service])
], SearchService);
//# sourceMappingURL=search.service.js.map