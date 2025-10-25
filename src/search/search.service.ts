// src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';

// Define a common interface for paginated results
// FIX: Export PaginatedResult so it can be named publicly
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async searchCompanies(query: string, page: number = 1, limit: number = 10): Promise<PaginatedResult<Company>> {
    const skip = (page - 1) * limit;

    // Expanded search fields for better matching
    const [data, total] = await this.companyRepository.findAndCount({
      where: [
        { companyName: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
        { gstNumber: Like(`%${query}%`), isDeleted: false },
        { category: Like(`%${query}%`), isDeleted: false }, // Added category
        { about: Like(`%${query}%`), isDeleted: false }, // Added about
      ],
      take: limit,
      skip: skip,
    });

    return { data, total, page, limit };
  }

  async searchLeads(query: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Lead>> {
    const skip = (page - 1) * limit;

    // Expanded search fields for better matching
    const [data, total] = await this.leadRepository.findAndCount({
      where: [
        { title: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
        { location: Like(`%${query}%`), isDeleted: false }, // Added location
      ],
      relations: ['company'],
      take: limit,
      skip: skip,
      order: { createdAt: 'DESC' },
    });
    
    return { data, total, page, limit };
  }

  async searchProducts(query: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Product>> {
    const skip = (page - 1) * limit;

    // Expanded search fields for better matching
    const [data, total] = await this.productRepository.findAndCount({
      where: [
        { name: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
      ],
      relations: ['company'],
      take: limit,
      skip: skip,
      order: { createdAt: 'DESC' },
    });
    
    return { data, total, page, limit };
  }

  async searchAll(query: string, companyPage: number = 1, companyLimit: number = 10, leadPage: number = 1, leadLimit: number = 20, productPage: number = 1, productLimit: number = 20): Promise<{
    companies: PaginatedResult<Company>;
    leads: PaginatedResult<Lead>;
    products: PaginatedResult<Product>;
  }> {
    const [companies, leads, products] = await Promise.all([
      this.searchCompanies(query, companyPage, companyLimit),
      this.searchLeads(query, leadPage, leadLimit),
      this.searchProducts(query, productPage, productLimit),
    ]);

    return { companies, leads, products };
  }
}