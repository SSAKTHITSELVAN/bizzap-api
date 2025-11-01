import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Company } from '../company/entities/company.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Product } from '../products/entities/product.entity';
import { S3Service } from '../chat/s3.service'; // Import S3Service

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
    private s3Service: S3Service, // Inject S3Service
  ) {}

  /**
   * Generate signed URLs for company assets (logo, userPhoto, coverImage)
   */
  private async generateSignedUrlsForCompany(company: any): Promise<void> {
    if (!company) return;

    try {
      if (company.logo && this.s3Service.isS3Key(company.logo)) {
        company.logo = await this.s3Service.generateSignedUrl(company.logo, 3600);
      }

      if (company.userPhoto && this.s3Service.isS3Key(company.userPhoto)) {
        company.userPhoto = await this.s3Service.generateSignedUrl(company.userPhoto, 3600);
      }

      if (company.coverImage && this.s3Service.isS3Key(company.coverImage)) {
        company.coverImage = await this.s3Service.generateSignedUrl(company.coverImage, 3600);
      }
    } catch (error) {
      console.error(`Failed to generate signed URLs for company ${company.id}:`, error);
    }
  }

  /**
   * Generate signed URLs for an array of companies
   */
  private async generateSignedUrlsForCompanies(companies: Company[]): Promise<Company[]> {
    for (const company of companies) {
      await this.generateSignedUrlsForCompany(company);
    }
    return companies;
  }

  async searchCompanies(query: string, page: number = 1, limit: number = 10): Promise<PaginatedResult<Company>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.companyRepository.findAndCount({
      where: [
        { companyName: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
        { gstNumber: Like(`%${query}%`), isDeleted: false },
        { category: Like(`%${query}%`), isDeleted: false },
        { about: Like(`%${query}%`), isDeleted: false },
      ],
      take: limit,
      skip: skip,
    });

    // Generate signed URLs for company assets
    const companiesWithUrls = await this.generateSignedUrlsForCompanies(data);

    return { data: companiesWithUrls, total, page, limit };
  }

  async searchLeads(query: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Lead>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.leadRepository.findAndCount({
      where: [
        { title: Like(`%${query}%`), isDeleted: false },
        { description: Like(`%${query}%`), isDeleted: false },
        { location: Like(`%${query}%`), isDeleted: false },
      ],
      relations: ['company'],
      take: limit,
      skip: skip,
      order: { createdAt: 'DESC' },
    });

    // Generate signed URLs for each lead's company
    for (const lead of data) {
      if (lead.company) {
        await this.generateSignedUrlsForCompany(lead.company);
      }
    }
    
    return { data, total, page, limit };
  }

  async searchProducts(query: string, page: number = 1, limit: number = 20): Promise<PaginatedResult<Product>> {
    const skip = (page - 1) * limit;

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

    // Generate signed URLs for each product's company
    for (const product of data) {
      if (product.company) {
        await this.generateSignedUrlsForCompany(product.company);
      }
    }
    
    return { data, total, page, limit };
  }

  async searchAll(
    query: string, 
    companyPage: number = 1, 
    companyLimit: number = 10, 
    leadPage: number = 1, 
    leadLimit: number = 20, 
    productPage: number = 1, 
    productLimit: number = 20
  ): Promise<{
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