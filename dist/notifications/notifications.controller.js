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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notifications_service_1 = require("./notifications.service");
const register_token_dto_1 = require("./dto/register-token.dto");
const send_broadcast_dto_1 = require("./dto/send-broadcast.dto");
const mark_notification_read_dto_1 = require("./dto/mark-notification-read.dto");
const jwt_auth_guard_1 = require("../core/guards/jwt-auth.guard");
let NotificationsController = class NotificationsController {
    notificationsService;
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    async registerToken(req, registerTokenDto) {
        const token = await this.notificationsService.registerToken(req.user.companyId, registerTokenDto.token, registerTokenDto.deviceId, registerTokenDto.platform);
        return {
            message: 'Token registered successfully',
            data: token,
        };
    }
    async unregisterToken(token) {
        await this.notificationsService.unregisterToken(token);
        return {
            message: 'Token unregistered successfully',
        };
    }
    async getUserNotifications(req) {
        return this.notificationsService.getUserNotifications(req.user.companyId);
    }
    async getUnreadCount(req) {
        const count = await this.notificationsService.getUnreadCount(req.user.companyId);
        return { count };
    }
    async markAsRead(dto) {
        await this.notificationsService.markAsRead(dto.notificationIds);
        return { success: true };
    }
    async markAllAsRead(req) {
        await this.notificationsService.markAllAsRead(req.user.companyId);
        return { success: true };
    }
    async deleteAllNotifications(req) {
        await this.notificationsService.deleteAllNotifications(req.user.companyId);
        return { success: true };
    }
    async sendBroadcast(broadcastDto) {
        await this.notificationsService.sendBroadcastNotification(broadcastDto.title, broadcastDto.body, broadcastDto.data);
        return { message: 'Broadcast sent' };
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Post)('register-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Register Expo push token for notifications' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Token registered successfully' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_token_dto_1.RegisterTokenDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "registerToken", null);
__decorate([
    (0, common_1.Post)('unregister-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Unregister Expo push token' }),
    __param(0, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "unregisterToken", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user notifications' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUserNotifications", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unread notification count' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Post)('mark-read'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark notifications as read' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [mark_notification_read_dto_1.MarkNotificationReadDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Post)('mark-all-read'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark ALL notifications as read' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)('all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete all notifications' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "deleteAllNotifications", null);
__decorate([
    (0, common_1.Post)('broadcast'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, swagger_1.ApiOperation)({ summary: 'Send broadcast (Admin)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_broadcast_dto_1.SendBroadcastDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "sendBroadcast", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map