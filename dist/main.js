"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const response_interceptor_1 = require("./core/interceptors/response.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe());
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        allowedHeaders: '*',
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Bizzap API')
        .setDescription('Business networking platform API - Free leads with referral bonuses')
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
    }, 'JWT-auth')
        .addTag('Auth', 'Authentication and authorization endpoints')
        .addTag('Companies', 'Company profile and management')
        .addTag('Leads', 'Lead creation, consumption, and management')
        .addTag('Products', 'Product catalog management')
        .addTag('Posts', 'Social posts, comments, likes, and saves')
        .addTag('Followers', 'Company follow/unfollow system')
        .addTag('Chat', 'Real-time messaging between companies')
        .addTag('Search', 'Global search functionality')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
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
    await app.listen(PORT, '0.0.0.0');
    console.log(`🚀 Application is running on: http://localhost:${PORT}`);
    console.log(`📚 Swagger UI: http://localhost:${PORT}/api/docs`);
    console.log(`🔗 Android Asset Links: http://localhost:${PORT}/.well-known/assetlinks.json`);
    console.log(`🍎 iOS Association: http://localhost:${PORT}/.well-known/apple-app-site-association`);
}
bootstrap();
//# sourceMappingURL=main.js.map