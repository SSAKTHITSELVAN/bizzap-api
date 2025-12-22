// src/main.ts - Simplified Swagger configuration
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors();

  // Swagger configuration with organized tags
  const config = new DocumentBuilder()
    .setTitle('Bizzap API')
    .setDescription('Business networking platform API - Free leads with referral bonuses')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    // Core functionality tags
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Companies', 'Company profile and management')
    .addTag('Leads', 'Lead creation, consumption, and management (10 free leads/month + referral bonuses)')
    .addTag('Products', 'Product catalog management')
    .addTag('Posts', 'Social posts, comments, likes, and saves')
    
    // Social features tags
    .addTag('Followers', 'Company follow/unfollow system')
    .addTag('Chat', 'Real-time messaging between companies')
    
    // Utility tags
    .addTag('Search', 'Global search functionality')
    
    // Admin tags
    .addTag('Admin-Leads', 'Admin-only lead metrics and management')
    .addTag('Admin-Companies', 'Admin-only company management')
    .addTag('Admin-Products', 'Admin-only product management')
    .addTag('Admin-Posts', 'Admin-only posts management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      displayRequestDuration: true,
    },
  });
  
  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`Application is running on: http://localhost:${PORT}`);
  console.log(`Swagger UI is available at: http://localhost:${PORT}/api/docs`);
}
bootstrap();