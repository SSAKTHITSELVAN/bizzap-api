import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { S3Service } from '../chat/s3.service';
export declare class ProductsService {
    private productRepository;
    private s3Service;
    constructor(productRepository: Repository<Product>, s3Service: S3Service);
    create(companyId: string, createProductDto: CreateProductDto, images?: Express.Multer.File[]): Promise<Product>;
    findAllPublic(): Promise<Product[]>;
    findByCompanyPublic(companyId: string): Promise<{
        products: Product[];
        totalCount: number;
    }>;
    findOnePublic(id: string): Promise<Product>;
    findAll(): Promise<Product[]>;
    findByCompany(companyId: string): Promise<Product[]>;
    findOne(id: string): Promise<Product>;
    update(id: string, companyId: string, updateProductDto: UpdateProductDto, existingImages?: string[], newImages?: Express.Multer.File[]): Promise<Product>;
    remove(id: string, companyId: string): Promise<void>;
    private uploadProductImages;
    private transformProductWithSignedUrls;
    private generateSignedUrlsForProducts;
    private generateSignedUrlsForCompany;
}
