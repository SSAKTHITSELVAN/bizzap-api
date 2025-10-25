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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a text-only post (no media)' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  async create(@Request() req, @Body() createPostDto: CreatePostDto) {
    return {
      message: 'Post created successfully',
      data: await this.postsService.create(req.user.companyId, createPostDto),
    };
  }

  @HttpPost('with-media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 5 },
      { name: 'video', maxCount: 1 },
    ])
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Create a post with EITHER images OR video (not both)',
    description: 'Upload either multiple images (up to 5) OR a single video with text content. Cannot upload both.'
  })
  @ApiBody({
    description: 'Post with media files (EITHER images OR video, not both)',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Check out our latest update! 🚀' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Up to 5 images (10MB each) - Use EITHER images OR video',
        },
        video: {
          type: 'string',
          format: 'binary',
          description: 'Single video file (100MB max) - Use EITHER images OR video',
        },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Post with media created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type, size, or both images and video provided' })
  async createWithMedia(
    @Request() req,
    @UploadedFiles() files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] },
    @Body() createPostDto: CreatePostDto,
  ) {
    const hasImages = files?.images && files.images.length > 0;
    const hasVideo = files?.video && files.video.length > 0;

    if (hasImages && hasVideo) {
      throw new BadRequestException('You can upload either images or a video, not both together');
    }

    if (!hasImages && !hasVideo) {
      throw new BadRequestException('Please provide at least one image or a video');
    }

    if (hasImages && files.images) {
      for (const image of files.images) {
        if (!image.mimetype.startsWith('image/')) {
          throw new BadRequestException('Only image files are allowed for images field');
        }
        if (image.size > 10 * 1024 * 1024) {
          throw new BadRequestException('Each image must be less than 10MB');
        }
      }
    }

    if (hasVideo && files.video) {
      const video = files.video[0];
      if (!video.mimetype.startsWith('video/')) {
        throw new BadRequestException('Only video files are allowed for video field');
      }
      if (video.size > 100 * 1024 * 1024) {
        throw new BadRequestException('Video must be less than 100MB');
      }
    }

    return {
      message: 'Post created successfully',
      data: await this.postsService.createWithMedia(
        req.user.companyId,
        createPostDto,
        files.images,
        files.video?.[0]
      ),
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

  @Get('top-ten')
  @ApiOperation({ summary: 'Get top 10 posts by engagement (public)' })
  @ApiResponse({ status: 200, description: 'Top 10 posts retrieved successfully' })
  async getTopTenPosts() {
    return {
      message: 'Top 10 posts retrieved successfully',
      data: await this.postsService.getTopTenPosts(),
    };
  }

  @Get('videos')
  @ApiOperation({ summary: 'Get posts that contain videos only' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Video posts retrieved successfully' })
  async findVideoPosts(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const result = await this.postsService.findVideoPosts(pageNum, limitNum);
    
    return {
      message: 'Video posts retrieved successfully',
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

  @HttpPost(':id/save')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle save on a post' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({ status: 200, description: 'Post save toggled successfully' })
  async toggleSave(@Param('id') id: string, @Request() req) {
    const result = await this.postsService.toggleSave(id, req.user.companyId);
    return {
      message: result.saved ? 'Post saved successfully' : 'Post unsaved successfully',
      data: result,
    };
  }

  @Get('saved/my-saved-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all saved posts by authenticated user' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Saved posts retrieved successfully' })
  async getMySavedPosts(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const result = await this.postsService.getSavedPosts(req.user.companyId, pageNum, limitNum);
    
    return {
      message: 'Saved posts retrieved successfully',
      data: result.posts,
      pagination: {
        currentPage: pageNum,
        itemsPerPage: limitNum,
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    };
  }

  @Delete('saved/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove a post from saved posts' })
  @ApiParam({ name: 'postId', description: 'Post UUID to unsave' })
  @ApiResponse({ status: 200, description: 'Post removed from saved posts successfully' })
  async removeSavedPost(@Param('postId') postId: string, @Request() req) {
    const result = await this.postsService.removeSavedPost(postId, req.user.companyId);
    return {
      message: 'Post removed from saved posts successfully',
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
  @ApiOperation({ summary: 'Update post content (text only - no media changes)' })
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
  @ApiOperation({ summary: 'Delete a post (and associated S3 files)' })
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