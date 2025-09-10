// src/modules/products/products.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(companyId: string, createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...createProductDto,
      companyId,
    });
    return this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCompany(companyId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['company'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, companyId: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    if (product.companyId !== companyId) {
      throw new ForbiddenException('You can only update your own products');
    }
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const product = await this.findOne(id);
    if (product.companyId !== companyId) {
      throw new ForbiddenException('You can only delete your own products');
    }
    await this.productRepository.update(id, { isDeleted: true });
  }
}

