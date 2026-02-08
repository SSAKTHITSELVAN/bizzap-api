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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const search_service_1 = require("./search.service");
let SearchController = class SearchController {
    searchService;
    constructor(searchService) {
        this.searchService = searchService;
    }
    async searchAll(query, companyPage, companyLimit, leadPage, leadLimit, productPage, productLimit) {
        if (!query || query.trim().length < 2) {
            return {
                message: 'Query must be at least 2 characters long',
                data: {
                    companies: { data: [], total: 0, page: companyPage, limit: companyLimit },
                    leads: { data: [], total: 0, page: leadPage, limit: leadLimit },
                    products: { data: [], total: 0, page: productPage, limit: productLimit },
                },
            };
        }
        return {
            message: 'Search results retrieved successfully',
            data: await this.searchService.searchAll(query.trim(), companyPage, companyLimit, leadPage, leadLimit, productPage, productLimit),
        };
    }
    async searchCompanies(query, page, limit) {
        if (!query || query.trim().length < 2) {
            return {
                message: 'Query must be at least 2 characters long',
                data: { data: [], total: 0, page, limit },
            };
        }
        return {
            message: 'Companies search results retrieved successfully',
            data: await this.searchService.searchCompanies(query.trim(), page, limit),
        };
    }
    async searchLeads(query, page, limit) {
        if (!query || query.trim().length < 2) {
            return {
                message: 'Query must be at least 2 characters long',
                data: { data: [], total: 0, page, limit },
            };
        }
        return {
            message: 'Leads search results retrieved successfully',
            data: await this.searchService.searchLeads(query.trim(), page, limit),
        };
    }
    async searchProducts(query, page, limit) {
        if (!query || query.trim().length < 2) {
            return {
                message: 'Query must be at least 2 characters long',
                data: { data: [], total: 0, page, limit },
            };
        }
        return {
            message: 'Products search results retrieved successfully',
            data: await this.searchService.searchProducts(query.trim(), page, limit),
        };
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Search across all entities (companies, leads, products) with separate pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'web development' }),
    (0, swagger_1.ApiQuery)({ name: 'companyPage', required: false, type: Number, description: 'Page number for company results (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'companyLimit', required: false, type: Number, description: 'Items per page for companies (default: 10)' }),
    (0, swagger_1.ApiQuery)({ name: 'leadPage', required: false, type: Number, description: 'Page number for lead results (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'leadLimit', required: false, type: Number, description: 'Items per page for leads (default: 20)' }),
    (0, swagger_1.ApiQuery)({ name: 'productPage', required: false, type: Number, description: 'Page number for product results (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'productLimit', required: false, type: Number, description: 'Items per page for products (default: 20)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Search results retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Query too short (minimum 2 characters)' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('companyPage', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('companyLimit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('leadPage', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('leadLimit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(5, (0, common_1.Query)('productPage', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(6, (0, common_1.Query)('productLimit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number, Number, Number, Number]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchAll", null);
__decorate([
    (0, common_1.Get)('companies'),
    (0, swagger_1.ApiOperation)({ summary: 'Search companies with pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'tech solutions' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Companies search results retrieved successfully' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(10), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchCompanies", null);
__decorate([
    (0, common_1.Get)('leads'),
    (0, swagger_1.ApiOperation)({ summary: 'Search leads with pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'website development' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Leads search results retrieved successfully' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchLeads", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'Search products with pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'web development' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Products search results retrieved successfully' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "searchProducts", null);
exports.SearchController = SearchController = __decorate([
    (0, swagger_1.ApiTags)('Search'),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map