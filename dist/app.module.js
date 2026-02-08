"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const typeorm_config_1 = require("./database/typeorm.config");
const schedule_1 = require("@nestjs/schedule");
const app_controller_1 = require("./app.controller");
const auth_module_1 = require("./auth/auth.module");
const company_module_1 = require("./company/company.module");
const leads_module_1 = require("./leads/leads.module");
const products_module_1 = require("./products/products.module");
const followers_module_1 = require("./followers/followers.module");
const search_module_1 = require("./search/search.module");
const chat_module_1 = require("./chat/chat.module");
const posts_module_1 = require("./posts/posts.module");
const subscription_module_1 = require("./subscription/subscription.module");
const notifications_module_1 = require("./notifications/notifications.module");
const analytics_module_1 = require("./analytics/analytics.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRoot(typeorm_config_1.typeOrmConfig),
            jwt_1.JwtModule.register({
                global: true,
                secret: process.env.JWT_SECRET || 'bizzap-secret-key',
                signOptions: { expiresIn: '30d' },
            }),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            company_module_1.CompanyModule,
            leads_module_1.LeadsModule,
            products_module_1.ProductsModule,
            followers_module_1.FollowersModule,
            search_module_1.SearchModule,
            chat_module_1.ChatModule,
            posts_module_1.PostsModule,
            subscription_module_1.SubscriptionModule,
            notifications_module_1.NotificationsModule,
            analytics_module_1.AnalyticsModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map