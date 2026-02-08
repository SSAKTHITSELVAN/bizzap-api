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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("./entities/product.entity");
const s3_service_1 = require("../chat/s3.service");
let ProductsService = class ProductsService {
    productRepository;
    s3Service;
    constructor(productRepository, s3Service) {
        this.productRepository = productRepository;
        this.s3Service = s3Service;
    }
    async create(companyId, createProductDto, images) {
        let imageKeys = [];
        if (images && images.length > 0) {
            imageKeys = await this.uploadProductImages(images);
        }
        const product = this.productRepository.create({
            ...createProductDto,
            companyId,
            images: imageKeys,
        });
        await this.productRepository.save(product);
        const savedProduct = await this.productRepository.findOne({
            where: { id: product.id },
            relations: ['company'],
        });
        if (!savedProduct) {
            throw new common_1.NotFoundException('Product could not be retrieved after creation');
        }
        return await this.transformProductWithSignedUrls(savedProduct);
    }
    async findAllPublic() {
        const products = await this.productRepository.find({
            where: { isDeleted: false },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        return await this.generateSignedUrlsForProducts(products);
    }
    async findByCompanyPublic(companyId) {
        const products = await this.productRepository.find({
            where: { companyId, isDeleted: false },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        const productsWithUrls = await this.generateSignedUrlsForProducts(products);
        return {
            products: productsWithUrls,
            totalCount: products.length,
        };
    }
    async findOnePublic(id) {
        const product = await this.productRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return await this.transformProductWithSignedUrls(product);
    }
    async findAll() {
        const products = await this.productRepository.find({
            where: { isDeleted: false },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        return await this.generateSignedUrlsForProducts(products);
    }
    async findByCompany(companyId) {
        const products = await this.productRepository.find({
            where: { companyId, isDeleted: false },
            relations: ['company'],
            order: { createdAt: 'DESC' },
        });
        return await this.generateSignedUrlsForProducts(products);
    }
    async findOne(id) {
        const product = await this.productRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return await this.transformProductWithSignedUrls(product);
    }
    async update(id, companyId, updateProductDto, existingImages, newImages) {
        const product = await this.productRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['company'],
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (product.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only update your own products');
        }
        let updatedImageKeys = [];
        if (existingImages && Array.isArray(existingImages)) {
            updatedImageKeys = existingImages.filter(key => {
                const isS3Key = this.s3Service.isS3Key(key);
                const belongsToProduct = product.images.includes(key);
                return isS3Key && belongsToProduct;
            });
        }
        const imagesToDelete = product.images.filter(key => !updatedImageKeys.includes(key));
        for (const imageKey of imagesToDelete) {
            try {
                await this.s3Service.deleteFile(imageKey);
            }
            catch (error) {
                console.error(`Failed to delete image ${imageKey}:`, error);
            }
        }
        if (newImages && newImages.length > 0) {
            const newImageKeys = await this.uploadProductImages(newImages);
            updatedImageKeys = [...updatedImageKeys, ...newImageKeys];
        }
        Object.assign(product, updateProductDto);
        product.images = updatedImageKeys;
        const updatedProduct = await this.productRepository.save(product);
        return await this.transformProductWithSignedUrls(updatedProduct);
    }
    async remove(id, companyId) {
        const product = await this.productRepository.findOne({
            where: { id, isDeleted: false },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (product.companyId !== companyId) {
            throw new common_1.ForbiddenException('You can only delete your own products');
        }
        for (const imageKey of product.images) {
            try {
                await this.s3Service.deleteFile(imageKey);
            }
            catch (error) {
                console.error(`Failed to delete image ${imageKey}:`, error);
            }
        }
        await this.productRepository.update(id, { isDeleted: true });
    }
    async uploadProductImages(images) {
        const uploadPromises = images.map(image => this.s3Service.uploadFile(image, 'product-images'));
        const uploadResults = await Promise.all(uploadPromises);
        return uploadResults.map(result => result.key);
    }
    async transformProductWithSignedUrls(product) {
        const productObj = JSON.parse(JSON.stringify(product));
        if (productObj.images && Array.isArray(productObj.images) && productObj.images.length > 0) {
            const signedImageUrls = [];
            for (const imageKey of productObj.images) {
                if (imageKey) {
                    try {
                        const signedUrl = await this.s3Service.getAccessibleUrl(imageKey);
                        signedImageUrls.push(signedUrl || imageKey);
                    }
                    catch (error) {
                        console.error(`Failed to generate signed URL for ${imageKey}:`, error.message);
                        signedImageUrls.push(imageKey);
                    }
                }
            }
            productObj.images = signedImageUrls;
        }
        if (productObj.company) {
            productObj.company = await this.generateSignedUrlsForCompany(productObj.company);
        }
        return productObj;
    }
    async generateSignedUrlsForProducts(products) {
        const transformedProducts = [];
        for (const product of products) {
            const transformed = await this.transformProductWithSignedUrls(product);
            transformedProducts.push(transformed);
        }
        return transformedProducts;
    }
    async generateSignedUrlsForCompany(company) {
        if (!company)
            return company;
        const companyObj = JSON.parse(JSON.stringify(company));
        try {
            if (companyObj.logo) {
                const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.logo);
                companyObj.logo = signedUrl || companyObj.logo;
            }
            if (companyObj.userPhoto) {
                const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.userPhoto);
                companyObj.userPhoto = signedUrl || companyObj.userPhoto;
            }
            if (companyObj.coverImage) {
                const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.coverImage);
                companyObj.coverImage = signedUrl || companyObj.coverImage;
            }
        }
        catch (error) {
            console.error(`Failed to generate signed URLs for company ${companyObj.id}:`, error);
        }
        return companyObj;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        s3_service_1.S3Service])
], ProductsService);
//# sourceMappingURL=products.service.js.map