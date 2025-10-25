// src/modules/search/search.controller.ts - Updated with pagination
import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search across all entities (companies, leads, products) with separate pagination' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'web development' })
  @ApiQuery({ name: 'companyPage', required: false, type: Number, description: 'Page number for company results (default: 1)' })
  @ApiQuery({ name: 'companyLimit', required: false, type: Number, description: 'Items per page for companies (default: 10)' })
  @ApiQuery({ name: 'leadPage', required: false, type: Number, description: 'Page number for lead results (default: 1)' })
  @ApiQuery({ name: 'leadLimit', required: false, type: Number, description: 'Items per page for leads (default: 20)' })
  @ApiQuery({ name: 'productPage', required: false, type: Number, description: 'Page number for product results (default: 1)' })
  @ApiQuery({ name: 'productLimit', required: false, type: Number, description: 'Items per page for products (default: 20)' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Query too short (minimum 2 characters)' })
  async searchAll(
    @Query('q') query: string,
    @Query('companyPage', new DefaultValuePipe(1), ParseIntPipe) companyPage: number,
    @Query('companyLimit', new DefaultValuePipe(10), ParseIntPipe) companyLimit: number,
    @Query('leadPage', new DefaultValuePipe(1), ParseIntPipe) leadPage: number,
    @Query('leadLimit', new DefaultValuePipe(20), ParseIntPipe) leadLimit: number,
    @Query('productPage', new DefaultValuePipe(1), ParseIntPipe) productPage: number,
    @Query('productLimit', new DefaultValuePipe(20), ParseIntPipe) productLimit: number,
  ) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: {
          companies: { data: [], total: 0, page: companyPage, limit: companyLimit },
          leads: { data: [], total: 0, page: leadPage, limit: leadLimit },
          products: { data: [], total: 0, page: productPage, limit: productLimit },
        },
      };
    }

    return {
      message: 'Search results retrieved successfully',
      data: await this.searchService.searchAll(
        query.trim(),
        companyPage, companyLimit,
        leadPage, leadLimit,
        productPage, productLimit
      ),
    };
  }

  @Get('companies')
  @ApiOperation({ summary: 'Search companies with pagination' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'tech solutions' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Companies search results retrieved successfully' })
  async searchCompanies(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: { data: [], total: 0, page, limit },
      };
    }

    return {
      message: 'Companies search results retrieved successfully',
      data: await this.searchService.searchCompanies(query.trim(), page, limit),
    };
  }

  @Get('leads')
  @ApiOperation({ summary: 'Search leads with pagination' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'website development' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Leads search results retrieved successfully' })
  async searchLeads(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: { data: [], total: 0, page, limit },
      };
    }

    return {
      message: 'Leads search results retrieved successfully',
      data: await this.searchService.searchLeads(query.trim(), page, limit),
    };
  }

  @Get('products')
  @ApiOperation({ summary: 'Search products with pagination' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'web development' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Products search results retrieved successfully' })
  async searchProducts(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: { data: [], total: 0, page, limit },
      };
    }

    return {
      message: 'Products search results retrieved successfully',
      data: await this.searchService.searchProducts(query.trim(), page, limit),
    };
  }
}