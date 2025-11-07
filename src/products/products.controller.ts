// src/modules/products/products.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req, 
  HttpCode, 
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ========== PUBLIC ENDPOINTS ==========
  
  @Get('public')
  @ApiOperation({ summary: 'Get all products (public access)' })
  findAllPublic(): Promise<Product[]> {
    return this.productsService.findAllPublic();
  }

  @Get('public/company/:companyId')
  @ApiOperation({ summary: 'Get all products by company ID (public access)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  findByCompanyPublic(@Param('companyId') companyId: string): Promise<{ products: Product[]; totalCount: number }> {
    return this.productsService.findByCompanyPublic(companyId);
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get product by ID (public access)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  findOnePublic(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOnePublic(id);
  }

  // ========== PROTECTED ENDPOINTS ==========

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product with images' })
  @ApiBody({
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
  })
  async create(
    @Req() req,
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB per image
          new FileTypeValidator({ 
            fileType: /(image\/jpeg|image\/jpg|image\/png|image\/webp)/ 
          }),
        ],
        fileIsRequired: false, // Images are optional
      }),
    )
    images?: Express.Multer.File[],
  ): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.create(companyId, createProductDto, images);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('company')
  @ApiOperation({ summary: 'Get products by company (authenticated)' })
  findByCompany(@Req() req): Promise<Product[]> {
    const companyId = req.user.companyId;
    return this.productsService.findByCompany(companyId);
  }
  
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all products (authenticated)' })
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (authenticated)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update product with optional new images' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({
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
  })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Body('existingImages') existingImages?: string[], // S3 keys to keep
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ 
            fileType: /(image\/jpeg|image\/jpg|image\/png|image\/webp)/ 
          }),
        ],
        fileIsRequired: false,
      }),
    )
    newImages?: Express.Multer.File[],
  ): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.update(id, companyId, updateProductDto, existingImages, newImages);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  remove(@Req() req, @Param('id') id: string): Promise<void> {
    const companyId = req.user.companyId;
    return this.productsService.remove(id, companyId);
  }
}