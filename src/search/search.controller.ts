// src/modules/search/search.controller.ts - Updated with Swagger decorators
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search across all entities (companies, leads, products)' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'web development' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Query too short (minimum 2 characters)' })
  async searchAll(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: { companies: [], leads: [], products: [] },
      };
    }

    return {
      message: 'Search results retrieved successfully',
      data: await this.searchService.searchAll(query.trim()),
    };
  }

  @Get('companies')
  @ApiOperation({ summary: 'Search companies' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'tech solutions' })
  @ApiResponse({ status: 200, description: 'Companies search results retrieved successfully' })
  async searchCompanies(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: [],
      };
    }

    return {
      message: 'Companies search results retrieved successfully',
      data: await this.searchService.searchCompanies(query.trim()),
    };
  }

  @Get('leads')
  @ApiOperation({ summary: 'Search leads' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'website development' })
  @ApiResponse({ status: 200, description: 'Leads search results retrieved successfully' })
  async searchLeads(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: [],
      };
    }

    return {
      message: 'Leads search results retrieved successfully',
      data: await this.searchService.searchLeads(query.trim()),
    };
  }

  @Get('products')
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', description: 'Search query (minimum 2 characters)', example: 'web development' })
  @ApiResponse({ status: 200, description: 'Products search results retrieved successfully' })
  async searchProducts(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        message: 'Query must be at least 2 characters long',
        data: [],
      };
    }

    return {
      message: 'Products search results retrieved successfully',
      data: await this.searchService.searchProducts(query.trim()),
    };
  }
}