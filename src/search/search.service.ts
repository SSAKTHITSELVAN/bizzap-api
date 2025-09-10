
// src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';

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

  async searchCompanies(query: string): Promise<Company[]> {
    return this.companyRepository.find({
      where: [
        { companyName: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
        { gstNumber: Like(`%${query}%`), isDeleted: false },
      ],
      take: 10,
    });
  }

  async searchLeads(query: string): Promise<Lead[]> {
    return this.leadRepository.find({
      where: [
        { title: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
      ],
      relations: ['company'],
      take: 20,
      order: { createdAt: 'DESC' },
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.productRepository.find({
      where: [
        { name: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
      ],
      relations: ['company'],
      take: 20,
      order: { createdAt: 'DESC' },
    });
  }

  async searchAll(query: string): Promise<{
    companies: Company[];
    leads: Lead[];
    products: Product[];
  }> {
    const [companies, leads, products] = await Promise.all([
      this.searchCompanies(query),
      this.searchLeads(query),
      this.searchProducts(query),
    ]);

    return { companies, leads, products };
  }
}