"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AnalyticsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const create_analytics_dto_1 = require("./dto/create-analytics.dto");
const log_session_dto_1 = require("./dto/log-session.dto");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
let AnalyticsController = AnalyticsController_1 = class AnalyticsController {
    analyticsService;
    logger = new common_1.Logger(AnalyticsController_1.name);
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async trackScreenView(createAnalyticsDto, req) {
        const userId = req.user.companyId || req.user.id;
        if (!userId) {
            this.logger.error('User ID not found in token payload', req.user);
            throw new Error('User ID missing from authentication token');
        }
        return this.analyticsService.logScreenView(userId, createAnalyticsDto);
    }
    async logSession(logSessionDto, req) {
        const userId = req.user.companyId || req.user.id;
        return this.analyticsService.logSessionEvent(userId, logSessionDto.status);
    }
    async getScreenAnalytics() {
        return this.analyticsService.getScreenAnalytics();
    }
    async getActiveUsers() {
        return this.analyticsService.getActiveUsers();
    }
    async getUserEngagement(period, userId) {
        return this.analyticsService.getUserEngagement(period, userId);
    }
    async getLiveDistribution() {
        return this.analyticsService.getCurrentUserDistribution();
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)('track'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiOperation)({ summary: 'Log user screen time (entry/exit)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_analytics_dto_1.CreateAnalyticsDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "trackScreenView", null);
__decorate([
    (0, common_1.Post)('session'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiOperation)({ summary: 'Log App Open/Close events for Live Status' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [log_session_dto_1.LogSessionDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "logSession", null);
__decorate([
    (0, common_1.Get)('dashboard/screens'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiOperation)({ summary: 'Get popularity and avg time for all screens' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getScreenAnalytics", null);
__decorate([
    (0, common_1.Get)('dashboard/active-users'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of users active in the last 10 minutes (Excludes closed app)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getActiveUsers", null);
__decorate([
    (0, common_1.Get)('dashboard/user-engagement'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiOperation)({ summary: 'Top users by time spent with detailed breakdown' }),
    (0, swagger_1.ApiQuery)({ name: 'period', enum: ['day', 'week', 'month'], required: true }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, description: 'Filter by specific User ID' }),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getUserEngagement", null);
__decorate([
    (0, common_1.Get)('dashboard/live-distribution'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiOperation)({ summary: 'Count and list of active users per screen (Unique users only)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getLiveDistribution", null);
exports.AnalyticsController = AnalyticsController = AnalyticsController_1 = __decorate([
    (0, swagger_1.ApiTags)('Analytics'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map