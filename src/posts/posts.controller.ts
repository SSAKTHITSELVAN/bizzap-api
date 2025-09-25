import {
  Controller,
  Get,
  Post as HttpPost,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../core/guards/jwt-auth.guard';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @HttpPost()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  async create(@Request() req, @Body() createPostDto: CreatePostDto) {
    return {
      message: 'Post created successfully',
      data: await this.postsService.create(req.user.companyId, createPostDto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all active posts with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const result = await this.postsService.findAll(pageNum, limitNum);
    
    return {
      message: 'Posts retrieved successfully',
      data: result.posts,
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    };
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get authenticated company posts' })
  @ApiResponse({ status: 200, description: 'My posts retrieved successfully' })
  async findMyPosts(@Request() req) {
    return {
      message: 'My posts retrieved successfully',
      data: await this.postsService.findByCompany(req.user.companyId),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return {
      message: 'Post retrieved successfully',
      data: await this.postsService.findOne(id),
    };
  }

  @HttpPost(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle like on a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post like toggled successfully' })
  async toggleLike(@Param('id') id: string, @Request() req) {
    const result = await this.postsService.toggleLike(id, req.user.companyId);
    return {
      message: result.liked ? 'Post liked successfully' : 'Post unliked successfully',
      data: result,
    };
  }

  @HttpPost(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add comment to a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  async addComment(@Param('id') id: string, @Request() req, @Body() createCommentDto: CreateCommentDto) {
    return {
      message: 'Comment added successfully',
      data: await this.postsService.addComment(id, req.user.companyId, createCommentDto),
    };
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  async getComments(@Param('id') id: string) {
    return {
      message: 'Comments retrieved successfully',
      data: await this.postsService.getComments(id),
    };
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  async deleteComment(@Param('commentId') commentId: string, @Request() req) {
    await this.postsService.deleteComment(commentId, req.user.companyId);
    return {
      message: 'Comment deleted successfully',
      data: null,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  async update(@Param('id') id: string, @Request() req, @Body() updatePostDto: UpdatePostDto) {
    return {
      message: 'Post updated successfully',
      data: await this.postsService.update(id, req.user.companyId, updatePostDto),
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.postsService.remove(id, req.user.companyId);
    return {
      message: 'Post deleted successfully',
      data: null,
    };
  }
}