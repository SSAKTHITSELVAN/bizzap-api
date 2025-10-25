

// src/main.ts - Updated with Chat tag
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

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Bizzap API')
    .setDescription('Business networking platform API with leads, products, and company management')
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
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Companies', 'Company management')
    .addTag('Leads', 'Lead management')
    .addTag('Products', 'Product management')
    .addTag('Followers', 'Company follow system')
    .addTag('Search', 'Search functionality')
    .addTag('Chat', 'Real-time chat system')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  
  await app.listen(3001);
  console.log('Application is running on: http://localhost:3000');
  console.log('Swagger UI is available at: http://localhost:3000/api/docs');
}
bootstrap();