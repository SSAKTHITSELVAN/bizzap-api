import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAllPublic(): Promise<Product[]>;
    findByCompanyPublic(companyId: string): Promise<{
        products: Product[];
        totalCount: number;
    }>;
    findOnePublic(id: string): Promise<Product>;
    create(req: any, createProductDto: CreateProductDto, images?: Express.Multer.File[]): Promise<Product>;
    findByCompany(req: any): Promise<Product[]>;
    findAll(): Promise<Product[]>;
    findOne(id: string): Promise<Product>;
    update(req: any, id: string, updateProductDto: UpdateProductDto, existingImages?: string[], newImages?: Express.Multer.File[]): Promise<Product>;
    remove(req: any, id: string): Promise<void>;
}
