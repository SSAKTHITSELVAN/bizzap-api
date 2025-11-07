// // src/modules/products/products.service.ts - WITH DEBUGGING
// import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Product } from './entities/product.entity';
// import { CreateProductDto } from './dto/create-product.dto';
// import { UpdateProductDto } from './dto/update-product.dto';
// import { S3Service } from '../chat/s3.service';

// @Injectable()
// export class ProductsService {
//   constructor(
//     @InjectRepository(Product)
//     private productRepository: Repository<Product>,
//     private s3Service: S3Service,
//   ) {}

//   async create(
//     companyId: string, 
//     createProductDto: CreateProductDto,
//     images?: Express.Multer.File[]
//   ): Promise<Product> {
//     // Upload images to S3 if provided
//     let imageKeys: string[] = [];
//     if (images && images.length > 0) {
//       imageKeys = await this.uploadProductImages(images);
//       console.log('✅ Uploaded product image S3 keys:', imageKeys);
//     }

//     const product = this.productRepository.create({
//       ...createProductDto,
//       companyId,
//       images: imageKeys, // Store S3 keys in database
//     });

//     await this.productRepository.save(product);
//     console.log('✅ Product saved to DB with S3 keys:', product.images);
    
//     // Fetch the saved product with company relation
//     const savedProduct = await this.productRepository.findOne({
//       where: { id: product.id },
//       relations: ['company'],
//     });

//     if (!savedProduct) {
//       throw new NotFoundException('Product could not be retrieved after creation');
//     }
    
//     console.log('🔍 Product fetched from DB, images:', savedProduct.images);
    
//     // Return with signed URLs
//     const transformed = await this.transformProductWithSignedUrls(savedProduct);
//     console.log('🔗 Product after transformation, images:', transformed.images);
    
//     return transformed;
//   }

//   // ========== PUBLIC METHODS ==========

//   async findAllPublic(): Promise<Product[]> {
//     const products = await this.productRepository.find({
//       where: { isDeleted: false },
//       relations: ['company'],
//       order: { createdAt: 'DESC' },
//     });

//     console.log(`🔍 Found ${products.length} products for public view`);
//     return await this.generateSignedUrlsForProducts(products);
//   }

//   async findByCompanyPublic(companyId: string): Promise<{ products: Product[]; totalCount: number }> {
//     const products = await this.productRepository.find({
//       where: { companyId, isDeleted: false },
//       relations: ['company'],
//       order: { createdAt: 'DESC' },
//     });

//     console.log(`🔍 Found ${products.length} products for company ${companyId}`);
//     const productsWithUrls = await this.generateSignedUrlsForProducts(products);

//     return {
//       products: productsWithUrls,
//       totalCount: products.length,
//     };
//   }

//   async findOnePublic(id: string): Promise<Product> {
//     const product = await this.productRepository.findOne({
//       where: { id, isDeleted: false },
//       relations: ['company'],
//     });

//     if (!product) {
//       throw new NotFoundException('Product not found');
//     }

//     console.log('🔍 Product found, images before transform:', product.images);
//     const transformed = await this.transformProductWithSignedUrls(product);
//     console.log('🔗 Product after transform, images:', transformed.images);
    
//     return transformed;
//   }

//   // ========== AUTHENTICATED METHODS ==========

//   async findAll(): Promise<Product[]> {
//     const products = await this.productRepository.find({
//       where: { isDeleted: false },
//       relations: ['company'],
//       order: { createdAt: 'DESC' },
//     });

//     console.log(`🔍 Found ${products.length} products (authenticated)`);
//     return await this.generateSignedUrlsForProducts(products);
//   }

//   async findByCompany(companyId: string): Promise<Product[]> {
//     const products = await this.productRepository.find({
//       where: { companyId, isDeleted: false },
//       relations: ['company'],
//       order: { createdAt: 'DESC' },
//     });

//     console.log(`🔍 Found ${products.length} products for authenticated company ${companyId}`);
//     return await this.generateSignedUrlsForProducts(products);
//   }

//   async findOne(id: string): Promise<Product> {
//     const product = await this.productRepository.findOne({
//       where: { id, isDeleted: false },
//       relations: ['company'],
//     });

//     if (!product) {
//       throw new NotFoundException('Product not found');
//     }

//     console.log('🔍 Product found (auth), images before transform:', product.images);
//     const transformed = await this.transformProductWithSignedUrls(product);
//     console.log('🔗 Product after transform (auth), images:', transformed.images);
    
//     return transformed;
//   }

//   async update(
//     id: string, 
//     companyId: string, 
//     updateProductDto: UpdateProductDto,
//     existingImages?: string[], // S3 keys to keep
//     newImages?: Express.Multer.File[]
//   ): Promise<Product> {
//     const product = await this.productRepository.findOne({
//       where: { id, isDeleted: false },
//       relations: ['company'],
//     });

//     if (!product) {
//       throw new NotFoundException('Product not found');
//     }

//     if (product.companyId !== companyId) {
//       throw new ForbiddenException('You can only update your own products');
//     }

//     // Handle image updates
//     let updatedImageKeys: string[] = [];

//     // Keep existing images if provided
//     if (existingImages && Array.isArray(existingImages)) {
//       console.log('📥 Existing images to keep:', existingImages);
//       // Filter to only keep valid S3 keys that belong to this product
//       updatedImageKeys = existingImages.filter(key => {
//         const isS3Key = this.s3Service.isS3Key(key);
//         const belongsToProduct = product.images.includes(key);
//         console.log(`Checking image ${key}: isS3Key=${isS3Key}, belongsToProduct=${belongsToProduct}`);
//         return isS3Key && belongsToProduct;
//       });
//       console.log('✅ Kept images:', updatedImageKeys);
//     }

//     // Delete images that are no longer needed
//     const imagesToDelete = product.images.filter(key => !updatedImageKeys.includes(key));
//     console.log('🗑️ Images to delete:', imagesToDelete);
//     for (const imageKey of imagesToDelete) {
//       try {
//         await this.s3Service.deleteFile(imageKey);
//         console.log(`✅ Deleted ${imageKey}`);
//       } catch (error) {
//         console.error(`❌ Failed to delete image ${imageKey}:`, error);
//       }
//     }

//     // Upload new images if provided
//     if (newImages && newImages.length > 0) {
//       const newImageKeys = await this.uploadProductImages(newImages);
//       console.log('✅ Uploaded new images:', newImageKeys);
//       updatedImageKeys = [...updatedImageKeys, ...newImageKeys];
//     }

//     // Update product
//     Object.assign(product, updateProductDto);
//     product.images = updatedImageKeys;

//     const updatedProduct = await this.productRepository.save(product);
//     console.log('✅ Product updated with images:', updatedProduct.images);
    
//     // Return with signed URLs
//     return await this.transformProductWithSignedUrls(updatedProduct);
//   }

//   async remove(id: string, companyId: string): Promise<void> {
//     const product = await this.productRepository.findOne({
//       where: { id, isDeleted: false },
//     });

//     if (!product) {
//       throw new NotFoundException('Product not found');
//     }

//     if (product.companyId !== companyId) {
//       throw new ForbiddenException('You can only delete your own products');
//     }

//     // Delete all images from S3
//     console.log('🗑️ Deleting product images:', product.images);
//     for (const imageKey of product.images) {
//       try {
//         await this.s3Service.deleteFile(imageKey);
//         console.log(`✅ Deleted ${imageKey}`);
//       } catch (error) {
//         console.error(`❌ Failed to delete image ${imageKey}:`, error);
//       }
//     }

//     await this.productRepository.update(id, { isDeleted: true });
//     console.log('✅ Product marked as deleted');
//   }

//   // ========== HELPER METHODS ==========

//   /**
//    * Upload multiple product images to S3
//    */
//   private async uploadProductImages(images: Express.Multer.File[]): Promise<string[]> {
//     const uploadPromises = images.map(image => 
//       this.s3Service.uploadFile(image, 'product-images')
//     );

//     const uploadResults = await Promise.all(uploadPromises);
//     return uploadResults.map(result => result.key); // Return S3 keys
//   }

//   /**
//    * 🔧 Transform a single product with signed URLs using getAccessibleUrl
//    */
//   private async transformProductWithSignedUrls(product: Product): Promise<Product> {
//     console.log('\n🔄 === TRANSFORM PRODUCT START ===');
//     console.log('Input product images:', product.images);
    
//     // Create a plain object copy to avoid TypeORM entity issues
//     const productObj = JSON.parse(JSON.stringify(product));
//     console.log('After JSON parse, images:', productObj.images);

//     // Generate signed URLs for product images
//     if (productObj.images && Array.isArray(productObj.images) && productObj.images.length > 0) {
//       console.log(`📸 Processing ${productObj.images.length} product images...`);
//       const signedImageUrls: string[] = [];
      
//       for (let i = 0; i < productObj.images.length; i++) {
//         const imageKey = productObj.images[i];
//         console.log(`\n[Image ${i + 1}/${productObj.images.length}]`);
//         console.log('  Original key:', imageKey);
//         console.log('  Type:', typeof imageKey);
//         console.log('  Is S3 key?', this.s3Service.isS3Key(imageKey));
        
//         if (imageKey) {
//           try {
//             const signedUrl = await this.s3Service.getAccessibleUrl(imageKey);
//             console.log('  Generated URL:', signedUrl ? '✅ Success' : '❌ Failed (null)');
//             if (signedUrl) {
//               console.log('  URL preview:', signedUrl.substring(0, 100) + '...');
//             }
//             signedImageUrls.push(signedUrl || imageKey); // Fallback to original if fails
//           } catch (error) {
//             console.error(`  ❌ Error generating signed URL:`, error.message);
//             signedImageUrls.push(imageKey); // Fallback to original on error
//           }
//         }
//       }
      
//       console.log('\n✅ Final signed URLs count:', signedImageUrls.length);
//       productObj.images = signedImageUrls;
//     } else {
//       console.log('⚠️ No product images to process');
//     }

//     // Generate signed URLs for company assets
//     if (productObj.company) {
//       console.log('\n🏢 Processing company assets...');
//       productObj.company = await this.generateSignedUrlsForCompany(productObj.company);
//     }

//     console.log('\n🔄 === TRANSFORM PRODUCT END ===');
//     console.log('Final product images:', productObj.images);
//     console.log('');
    
//     return productObj;
//   }

//   /**
//    * Generate signed URLs for multiple products
//    */
//   private async generateSignedUrlsForProducts(products: Product[]): Promise<Product[]> {
//     console.log(`\n🔄 Transforming ${products.length} products...`);
//     const transformedProducts: Product[] = [];
    
//     for (let i = 0; i < products.length; i++) {
//       console.log(`\n--- Product ${i + 1}/${products.length} ---`);
//       const transformed = await this.transformProductWithSignedUrls(products[i]);
//       transformedProducts.push(transformed);
//     }
    
//     console.log(`\n✅ Finished transforming ${transformedProducts.length} products\n`);
//     return transformedProducts;
//   }

//   /**
//    * 🔧 Generate signed URLs for company assets using getAccessibleUrl
//    */
//   private async generateSignedUrlsForCompany(company: any): Promise<any> {
//     if (!company) {
//       console.log('⚠️ No company data to process');
//       return company;
//     }

//     console.log('Company ID:', company.id);
    
//     // Create a plain object copy
//     const companyObj = JSON.parse(JSON.stringify(company));

//     try {
//       // Generate signed URL for company logo
//       if (companyObj.logo) {
//         console.log('  Processing logo:', companyObj.logo);
//         const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.logo);
//         console.log('  Logo signed URL:', signedUrl ? '✅ Success' : '❌ Failed');
//         companyObj.logo = signedUrl || companyObj.logo;
//       }

//       // Generate signed URL for user photo
//       if (companyObj.userPhoto) {
//         console.log('  Processing userPhoto:', companyObj.userPhoto);
//         const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.userPhoto);
//         console.log('  UserPhoto signed URL:', signedUrl ? '✅ Success' : '❌ Failed');
//         companyObj.userPhoto = signedUrl || companyObj.userPhoto;
//       }

//       // Generate signed URL for cover image
//       if (companyObj.coverImage) {
//         console.log('  Processing coverImage:', companyObj.coverImage);
//         const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.coverImage);
//         console.log('  CoverImage signed URL:', signedUrl ? '✅ Success' : '❌ Failed');
//         companyObj.coverImage = signedUrl || companyObj.coverImage;
//       }
//     } catch (error) {
//       console.error(`❌ Failed to generate signed URLs for company ${companyObj.id}:`, error);
//       // Return original if failed
//     }

//     return companyObj;
//   }
// }




//########################################################
// ######## without logs
//########################################################


// src/modules/products/products.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { S3Service } from '../chat/s3.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private s3Service: S3Service,
  ) {}

  async create(
    companyId: string, 
    createProductDto: CreateProductDto,
    images?: Express.Multer.File[]
  ): Promise<Product> {
    // Upload images to S3 if provided
    let imageKeys: string[] = [];
    if (images && images.length > 0) {
      imageKeys = await this.uploadProductImages(images);
    }

    const product = this.productRepository.create({
      ...createProductDto,
      companyId,
      images: imageKeys, // Store S3 keys in database
    });

    await this.productRepository.save(product);
    
    // Fetch the saved product with company relation
    const savedProduct = await this.productRepository.findOne({
      where: { id: product.id },
      relations: ['company'],
    });

    if (!savedProduct) {
      throw new NotFoundException('Product could not be retrieved after creation');
    }
    
    // Return with signed URLs
    return await this.transformProductWithSignedUrls(savedProduct);
  }

  // ========== PUBLIC METHODS ==========

  async findAllPublic(): Promise<Product[]> {
    const products = await this.productRepository.find({
      where: { isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    return await this.generateSignedUrlsForProducts(products);
  }

  async findByCompanyPublic(companyId: string): Promise<{ products: Product[]; totalCount: number }> {
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

  async findOnePublic(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return await this.transformProductWithSignedUrls(product);
  }

  // ========== AUTHENTICATED METHODS ==========

  async findAll(): Promise<Product[]> {
    const products = await this.productRepository.find({
      where: { isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    return await this.generateSignedUrlsForProducts(products);
  }

  async findByCompany(companyId: string): Promise<Product[]> {
    const products = await this.productRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    return await this.generateSignedUrlsForProducts(products);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return await this.transformProductWithSignedUrls(product);
  }

  async update(
    id: string, 
    companyId: string, 
    updateProductDto: UpdateProductDto,
    existingImages?: string[], // S3 keys to keep
    newImages?: Express.Multer.File[]
  ): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own products');
    }

    // Handle image updates
    let updatedImageKeys: string[] = [];

    // Keep existing images if provided
    if (existingImages && Array.isArray(existingImages)) {
      // Filter to only keep valid S3 keys that belong to this product
      updatedImageKeys = existingImages.filter(key => {
        const isS3Key = this.s3Service.isS3Key(key);
        const belongsToProduct = product.images.includes(key);
        return isS3Key && belongsToProduct;
      });
    }

    // Delete images that are no longer needed
    const imagesToDelete = product.images.filter(key => !updatedImageKeys.includes(key));
    for (const imageKey of imagesToDelete) {
      try {
        await this.s3Service.deleteFile(imageKey);
      } catch (error) {
        console.error(`Failed to delete image ${imageKey}:`, error);
      }
    }

    // Upload new images if provided
    if (newImages && newImages.length > 0) {
      const newImageKeys = await this.uploadProductImages(newImages);
      updatedImageKeys = [...updatedImageKeys, ...newImageKeys];
    }

    // Update product
    Object.assign(product, updateProductDto);
    product.images = updatedImageKeys;

    const updatedProduct = await this.productRepository.save(product);
    
    // Return with signed URLs
    return await this.transformProductWithSignedUrls(updatedProduct);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own products');
    }

    // Delete all images from S3
    for (const imageKey of product.images) {
      try {
        await this.s3Service.deleteFile(imageKey);
      } catch (error) {
        console.error(`Failed to delete image ${imageKey}:`, error);
      }
    }

    await this.productRepository.update(id, { isDeleted: true });
  }

  // ========== HELPER METHODS ==========

  /**
   * Upload multiple product images to S3
   */
  private async uploadProductImages(images: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = images.map(image => 
      this.s3Service.uploadFile(image, 'product-images')
    );

    const uploadResults = await Promise.all(uploadPromises);
    return uploadResults.map(result => result.key); // Return S3 keys
  }

  /**
   * Transform a single product with signed URLs using getAccessibleUrl
   */
  private async transformProductWithSignedUrls(product: Product): Promise<Product> {
    // Create a plain object copy to avoid TypeORM entity issues
    const productObj = JSON.parse(JSON.stringify(product));

    // Generate signed URLs for product images
    if (productObj.images && Array.isArray(productObj.images) && productObj.images.length > 0) {
      const signedImageUrls: string[] = [];
      
      for (const imageKey of productObj.images) {
        if (imageKey) {
          try {
            const signedUrl = await this.s3Service.getAccessibleUrl(imageKey);
            signedImageUrls.push(signedUrl || imageKey); // Fallback to original if fails
          } catch (error) {
            console.error(`Failed to generate signed URL for ${imageKey}:`, error.message);
            signedImageUrls.push(imageKey); // Fallback to original on error
          }
        }
      }
      
      productObj.images = signedImageUrls;
    }

    // Generate signed URLs for company assets
    if (productObj.company) {
      productObj.company = await this.generateSignedUrlsForCompany(productObj.company);
    }

    return productObj;
  }

  /**
   * Generate signed URLs for multiple products
   */
  private async generateSignedUrlsForProducts(products: Product[]): Promise<Product[]> {
    const transformedProducts: Product[] = [];
    
    for (const product of products) {
      const transformed = await this.transformProductWithSignedUrls(product);
      transformedProducts.push(transformed);
    }
    
    return transformedProducts;
  }

  /**
   * Generate signed URLs for company assets using getAccessibleUrl
   */
  private async generateSignedUrlsForCompany(company: any): Promise<any> {
    if (!company) return company;

    // Create a plain object copy
    const companyObj = JSON.parse(JSON.stringify(company));

    try {
      // Generate signed URL for company logo
      if (companyObj.logo) {
        const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.logo);
        companyObj.logo = signedUrl || companyObj.logo;
      }

      // Generate signed URL for user photo
      if (companyObj.userPhoto) {
        const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.userPhoto);
        companyObj.userPhoto = signedUrl || companyObj.userPhoto;
      }

      // Generate signed URL for cover image
      if (companyObj.coverImage) {
        const signedUrl = await this.s3Service.getAccessibleUrl(companyObj.coverImage);
        companyObj.coverImage = signedUrl || companyObj.coverImage;
      }
    } catch (error) {
      console.error(`Failed to generate signed URLs for company ${companyObj.id}:`, error);
      // Return original if failed
    }

    return companyObj;
  }
}