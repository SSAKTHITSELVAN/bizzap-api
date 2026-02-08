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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const products_service_1 = require("./products.service");
const create_product_dto_1 = require("./dto/create-product.dto");
const update_product_dto_1 = require("./dto/update-product.dto");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../core/guards/jwt-auth.guard");
let ProductsController = class ProductsController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    findAllPublic() {
        return this.productsService.findAllPublic();
    }
    findByCompanyPublic(companyId) {
        return this.productsService.findByCompanyPublic(companyId);
    }
    findOnePublic(id) {
        return this.productsService.findOnePublic(id);
    }
    async create(req, createProductDto, images) {
        const companyId = req.user.companyId;
        return this.productsService.create(companyId, createProductDto, images);
    }
    findByCompany(req) {
        const companyId = req.user.companyId;
        return this.productsService.findByCompany(companyId);
    }
    findAll() {
        return this.productsService.findAll();
    }
    findOne(id) {
        return this.productsService.findOne(id);
    }
    async update(req, id, updateProductDto, existingImages, newImages) {
        const companyId = req.user.companyId;
        return this.productsService.update(id, companyId, updateProductDto, existingImages, newImages);
    }
    remove(req, id) {
        const companyId = req.user.companyId;
        return this.productsService.remove(id, companyId);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Get)('public'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all products (public access)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAllPublic", null);
__decorate([
    (0, common_1.Get)('public/company/:companyId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all products by company ID (public access)' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findByCompanyPublic", null);
__decorate([
    (0, common_1.Get)('public/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get product by ID (public access)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Product ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOnePublic", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10)),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new product with images' }),
    (0, swagger_1.ApiBody)({
        description: 'Product creation with multiple image uploads',
        schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Product name',
                    example: 'Professional Website Development',
                },
                description: {
                    type: 'string',
                    description: 'Product description',
                    example: 'Custom website development with modern design',
                },
                price: {
                    type: 'number',
                    description: 'Product price',
                    example: 25000.00,
                },
                minimumQuantity: {
                    type: 'string',
                    description: 'Minimum quantity or payment terms',
                    example: 'Payment terms: 50% advance, 50% on completion',
                },
                images: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                    description: 'Product images (max 10, each max 5MB)',
                },
            },
            required: ['name', 'description'],
        },
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
            new common_1.FileTypeValidator({
                fileType: /(image\/jpeg|image\/jpg|image\/png|image\/webp)/
            }),
        ],
        fileIsRequired: false,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_product_dto_1.CreateProductDto, Array]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('company'),
    (0, swagger_1.ApiOperation)({ summary: 'Get products by company (authenticated)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findByCompany", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all products (authenticated)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get product by ID (authenticated)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Product ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(':id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10)),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Update product with optional new images' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Product ID' }),
    (0, swagger_1.ApiBody)({
        description: 'Product update with optional image uploads',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                price: { type: 'number' },
                minimumQuantity: { type: 'string' },
                existingImages: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'S3 keys of images to keep',
                },
                images: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                    description: 'New images to add',
                },
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Body)('existingImages')),
    __param(4, (0, common_1.UploadedFiles)(new common_1.ParseFilePipe({
        validators: [
            new common_1.MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
            new common_1.FileTypeValidator({
                fileType: /(image\/jpeg|image\/jpg|image\/png|image\/webp)/
            }),
        ],
        fileIsRequired: false,
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_product_dto_1.UpdateProductDto, Array, Array]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete product' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Product ID' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "remove", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('Products'),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map