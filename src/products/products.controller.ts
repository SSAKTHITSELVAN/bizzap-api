// // // src/modules/products/products.controller.ts
// // import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
// // import { ProductsService } from './products.service';
// // import { CreateProductDto } from './dto/create-product.dto';
// // import { UpdateProductDto } from './dto/update-product.dto';
// // import { Product } from './entities/product.entity';
// // import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
// // import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

// // @ApiBearerAuth('JWT-auth')
// // @ApiTags('Products')
// // @UseGuards(JwtAuthGuard)
// // @Controller('products')
// // export class ProductsController {
// //   constructor(private readonly productsService: ProductsService) {}

// //   @Post()
// //   @HttpCode(HttpStatus.CREATED)
// //   create(@Req() req, @Body() createProductDto: CreateProductDto): Promise<Product> {
// //     const companyId = req.user.companyId;
// //     return this.productsService.create(companyId, createProductDto);
// //   }

// //   @Get('company')
// //   findByCompany(@Req() req): Promise<Product[]> {
// //     const companyId = req.user.companyId;
// //     return this.productsService.findByCompany(companyId);
// //   }
  
// //   @Get()
// //   findAll(): Promise<Product[]> {
// //     return this.productsService.findAll();
// //   }

// //   @Get(':id')
// //   findOne(@Param('id') id: string): Promise<Product> {
// //     return this.productsService.findOne(id);
// //   }

// //   @Patch(':id')
// //   update(@Req() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<Product> {
// //     const companyId = req.user.companyId;
// //     return this.productsService.update(id, companyId, updateProductDto);
// //   }

// //   @Delete(':id')
// //   @HttpCode(HttpStatus.NO_CONTENT)
// //   remove(@Req() req, @Param('id') id: string): Promise<void> {
// //     const companyId = req.user.companyId;
// //     return this.productsService.remove(id, companyId);
// //   }
// // }


// // src/modules/products/products.controller.ts
// import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
// import { ProductsService } from './products.service';
// import { CreateProductDto } from './dto/create-product.dto';
// import { UpdateProductDto } from './dto/update-product.dto';
// import { Product } from './entities/product.entity';
// import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

// @ApiTags('Products')
// @Controller('products')
// export class ProductsController {
//   constructor(private readonly productsService: ProductsService) {}

//   // Public endpoint - no authentication required
//   @Get('public/:id')
//   @ApiOperation({ summary: 'Get product by ID (public access)' })
//   @ApiParam({ name: 'id', description: 'Product ID' })
//   findOnePublic(@Param('id') id: string): Promise<Product> {
//     return this.productsService.findOne(id);
//   }

//   // Protected endpoints below - require authentication
//   @ApiBearerAuth('JWT-auth')
//   @UseGuards(JwtAuthGuard)
//   @Post()
//   @HttpCode(HttpStatus.CREATED)
//   @ApiOperation({ summary: 'Create a new product' })
//   create(@Req() req, @Body() createProductDto: CreateProductDto): Promise<Product> {
//     const companyId = req.user.companyId;
//     return this.productsService.create(companyId, createProductDto);
//   }

//   @ApiBearerAuth('JWT-auth')
//   @UseGuards(JwtAuthGuard)
//   @Get('company')
//   @ApiOperation({ summary: 'Get products by company' })
//   findByCompany(@Req() req): Promise<Product[]> {
//     const companyId = req.user.companyId;
//     return this.productsService.findByCompany(companyId);
//   }
  
//   @ApiBearerAuth('JWT-auth')
//   @UseGuards(JwtAuthGuard)
//   @Get()
//   @ApiOperation({ summary: 'Get all products' })
//   findAll(): Promise<Product[]> {
//     return this.productsService.findAll();
//   }

//   @ApiBearerAuth('JWT-auth')
//   @UseGuards(JwtAuthGuard)
//   @Get(':id')
//   @ApiOperation({ summary: 'Get product by ID (authenticated)' })
//   @ApiParam({ name: 'id', description: 'Product ID' })
//   findOne(@Param('id') id: string): Promise<Product> {
//     return this.productsService.findOne(id);
//   }

//   @ApiBearerAuth('JWT-auth')
//   @UseGuards(JwtAuthGuard)
//   @Patch(':id')
//   @ApiOperation({ summary: 'Update product' })
//   @ApiParam({ name: 'id', description: 'Product ID' })
//   update(@Req() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<Product> {
//     const companyId = req.user.companyId;
//     return this.productsService.update(id, companyId, updateProductDto);
//   }

//   @ApiBearerAuth('JWT-auth')
//   @UseGuards(JwtAuthGuard)
//   @Delete(':id')
//   @HttpCode(HttpStatus.NO_CONTENT)
//   @ApiOperation({ summary: 'Delete product' })
//   @ApiParam({ name: 'id', description: 'Product ID' })
//   remove(@Req() req, @Param('id') id: string): Promise<void> {
//     const companyId = req.user.companyId;
//     return this.productsService.remove(id, companyId);
//   }
// }




// src/modules/products/products.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Public endpoints - no authentication required
  @Get('public/company/:companyId')
  @ApiOperation({ summary: 'Get all products by company ID (public access)' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  findByCompanyPublic(@Param('companyId') companyId: string): Promise<Product[]> {
    return this.productsService.findByCompany(companyId);
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get product by ID (public access)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  findOnePublic(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  // Protected endpoints below - require authentication
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  create(@Req() req, @Body() createProductDto: CreateProductDto): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.create(companyId, createProductDto);
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
  @ApiOperation({ summary: 'Get all products' })
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
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  update(@Req() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<Product> {
    const companyId = req.user.companyId;
    return this.productsService.update(id, companyId, updateProductDto);
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