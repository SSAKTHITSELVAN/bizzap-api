// import { Controller, Get, Delete, Param } from '@nestjs/common';
// import { PostsService } from './posts.service';
// import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

// @ApiTags('Admin-Posts')
// @Controller('admin/posts')
// export class AdminPostsController {
//   constructor(private readonly postsService: PostsService) {}

//   @Get('metrics/total')
//   @ApiOperation({ summary: 'Get total posts count (admin only)' })
//   @ApiResponse({ status: 200, description: 'Total posts count retrieved successfully' })
//   async getTotalPosts() {
//     return {
//       message: 'Total posts count retrieved successfully',
//       data: {
//         totalPosts: await this.postsService.getTotalPosts(),
//       },
//     };
//   }

//   @Get('metrics/daily')
//   @ApiOperation({ summary: 'Get post creation count per day (admin only)' })
//   @ApiResponse({ status: 200, description: 'Daily post count retrieved successfully' })
//   async getDailyPostMetrics() {
//     return {
//       message: 'Daily post count retrieved successfully',
//       data: await this.postsService.getPostsByDate(),
//     };
//   }

//   @Get('metrics/most-liked')
//   @ApiOperation({ summary: 'Get most liked posts (admin only)' })
//   @ApiResponse({ status: 200, description: 'Most liked posts retrieved successfully' })
//   async getMostLikedPosts() {
//     return {
//       message: 'Most liked posts retrieved successfully',
//       data: await this.postsService.getMostLikedPosts(),
//     };
//   }

//   @Get('metrics/most-viewed')
//   @ApiOperation({ summary: 'Get most viewed posts (admin only)' })
//   @ApiResponse({ status: 200, description: 'Most viewed posts retrieved successfully' })
//   async getMostViewedPosts() {
//     return {
//       message: 'Most viewed posts retrieved successfully',
//       data: await this.postsService.getMostViewedPosts(),
//     };
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get post by ID (admin only)' })
//   @ApiParam({ name: 'id', description: 'Post UUID' })
//   @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
//   async findOne(@Param('id') id: string) {
//     return {
//       message: 'Post retrieved successfully',
//       data: await this.postsService.findOne(id),
//     };
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete any post (admin only)' })
//   @ApiParam({ name: 'id', description: 'Post UUID' })
//   @ApiResponse({ status: 200, description: 'Post deleted successfully' })
//   async remove(@Param('id') id: string) {
//     // Admin can delete any post - pass empty companyId to bypass ownership check
//     await this.postsService.remove(id, '');
//     return {
//       message: 'Post deleted successfully',
//       data: null,
//     };
//   }
// }



// ##############################################################################
// ############### AWS S3 connection ############################################
// ##############################################################################


import { Controller, Get, Delete, Param } from '@nestjs/common';
import { PostsService } from './posts.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Admin-Posts')
@Controller('admin/posts')
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('metrics/total')
  @ApiOperation({ summary: 'Get total posts count (admin only)' })
  @ApiResponse({ status: 200, description: 'Total posts count retrieved successfully' })
  async getTotalPosts() {
    return {
      message: 'Total posts count retrieved successfully',
      data: {
        totalPosts: await this.postsService.getTotalPosts(),
      },
    };
  }

  @Get('metrics/daily')
  @ApiOperation({ summary: 'Get post creation count per day (admin only)' })
  @ApiResponse({ status: 200, description: 'Daily post count retrieved successfully' })
  async getDailyPostMetrics() {
    return {
      message: 'Daily post count retrieved successfully',
      data: await this.postsService.getPostsByDate(),
    };
  }

  @Get('metrics/most-liked')
  @ApiOperation({ summary: 'Get most liked posts (admin only)' })
  @ApiResponse({ status: 200, description: 'Most liked posts retrieved successfully' })
  async getMostLikedPosts() {
    return {
      message: 'Most liked posts retrieved successfully',
      data: await this.postsService.getMostLikedPosts(),
    };
  }

  @Get('metrics/most-viewed')
  @ApiOperation({ summary: 'Get most viewed posts (admin only)' })
  @ApiResponse({ status: 200, description: 'Most viewed posts retrieved successfully' })
  async getMostViewedPosts() {
    return {
      message: 'Most viewed posts retrieved successfully',
      data: await this.postsService.getMostViewedPosts(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID (admin only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return {
      message: 'Post retrieved successfully',
      data: await this.postsService.findOne(id),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete any post and associated S3 files (admin only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  async remove(@Param('id') id: string) {
    // Admin can delete any post - pass empty companyId to bypass ownership check
    await this.postsService.remove(id, '');
    return {
      message: 'Post deleted successfully',
      data: null,
    };
  }
}