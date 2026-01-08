
// ============================================
// FILE 3: src/main.ts (IMPORTANT UPDATE)
// Enable raw body for deep linking endpoints
// ============================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './core/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // IMPORTANT: Allows proper handling of .well-known endpoints
  });
  
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // CORS configuration - IMPORTANT for deep linking
  app.enableCors({
    origin: '*', // Allow all origins for .well-known endpoints
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*',
  });

  // Swagger configuration
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
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Companies', 'Company profile and management')
    .addTag('Leads', 'Lead creation, consumption, and management')
    .addTag('Products', 'Product catalog management')
    .addTag('Posts', 'Social posts, comments, likes, and saves')
    .addTag('Followers', 'Company follow/unfollow system')
    .addTag('Chat', 'Real-time messaging between companies')
    .addTag('Search', 'Global search functionality')
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
  
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, '0.0.0.0'); // Listen on all interfaces
  
  console.log(`🚀 Application is running on: http://localhost:${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api/docs`);
  console.log(`🔗 Android Asset Links: http://localhost:${PORT}/.well-known/assetlinks.json`);
  console.log(`🍎 iOS Association: http://localhost:${PORT}/.well-known/apple-app-site-association`);
}
bootstrap();