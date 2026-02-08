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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
const expo_push_token_entity_1 = require("./entities/expo-push-token.entity");
const company_entity_1 = require("../company/entities/company.entity");
const expo_server_sdk_1 = require("expo-server-sdk");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    notificationRepository;
    expoPushTokenRepository;
    companyRepository;
    logger = new common_1.Logger(NotificationsService_1.name);
    expo = new expo_server_sdk_1.Expo();
    constructor(notificationRepository, expoPushTokenRepository, companyRepository) {
        this.notificationRepository = notificationRepository;
        this.expoPushTokenRepository = expoPushTokenRepository;
        this.companyRepository = companyRepository;
    }
    async registerToken(companyId, token, deviceId, platform) {
        if (!expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            this.logger.error(`Invalid Expo Push Token: ${token}`);
            return null;
        }
        let tokenEntity = await this.expoPushTokenRepository.findOne({
            where: { token },
        });
        if (tokenEntity) {
            tokenEntity.companyId = companyId;
            tokenEntity.deviceId = deviceId;
            tokenEntity.platform = platform;
            tokenEntity.isActive = true;
            tokenEntity.updatedAt = new Date();
        }
        else {
            tokenEntity = this.expoPushTokenRepository.create({
                companyId,
                token,
                deviceId,
                platform,
                isActive: true,
            });
        }
        return this.expoPushTokenRepository.save(tokenEntity);
    }
    async unregisterToken(token) {
        await this.expoPushTokenRepository.delete({ token });
    }
    async sendPushNotifications(tokens, title, body, data = {}) {
        if (tokens.length === 0)
            return;
        const messages = [];
        for (const token of tokens) {
            if (!expo_server_sdk_1.Expo.isExpoPushToken(token))
                continue;
            messages.push({
                to: token,
                sound: 'default',
                title: title,
                body: body,
                data: data,
                priority: 'high',
                channelId: 'default',
            });
        }
        const chunks = this.expo.chunkPushNotifications(messages);
        const tickets = [];
        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            }
            catch (error) {
                this.logger.error('❌ Error sending push notification chunk', error);
            }
        }
        return tickets;
    }
    async createNotification(companyId, type, title, body, data = {}) {
        const notification = this.notificationRepository.create({
            companyId,
            type,
            title,
            body,
            data,
            isRead: false,
        });
        await this.notificationRepository.save(notification);
        const userTokens = await this.expoPushTokenRepository.find({
            where: { companyId, isActive: true },
        });
        const pushTokens = userTokens.map((t) => t.token);
        if (pushTokens.length > 0) {
            await this.sendPushNotifications(pushTokens, title, body, {
                ...data,
                notificationId: notification.id,
                type
            });
        }
        return notification;
    }
    async sendNewLeadNotification(leadId, leadTitle, creatorCompanyId) {
        const title = 'New Lead Alert 🚀';
        const body = `New requirement posted: ${leadTitle}`;
        const data = { leadId, type: notification_entity_1.NotificationType.NEW_LEAD };
        this.logger.log(`📢 Broadcasting new lead to all except ${creatorCompanyId}`);
        const tokens = await this.expoPushTokenRepository.find({
            where: {
                isActive: true,
                companyId: (0, typeorm_2.Not)(creatorCompanyId)
            }
        });
        const pushTokens = tokens.map(t => t.token);
        if (pushTokens.length > 0) {
            await this.sendPushNotifications(pushTokens, title, body, data);
        }
        const companies = await this.companyRepository.find({
            where: {
                id: (0, typeorm_2.Not)(creatorCompanyId),
                isDeleted: false
            },
            select: ['id']
        });
        if (companies.length > 0) {
            const notifications = companies.map(company => this.notificationRepository.create({
                companyId: company.id,
                type: notification_entity_1.NotificationType.NEW_LEAD,
                title,
                body,
                data,
                isRead: false,
                leadId
            }));
            await this.notificationRepository.save(notifications);
        }
    }
    async sendLeadConsumedNotification(companyId, leadTitle, consumerName) {
        const bodyText = consumerName
            ? `${consumerName} has viewed your lead: ${leadTitle}`
            : `Your lead "${leadTitle}" was viewed by a potential partner`;
        return this.createNotification(companyId, notification_entity_1.NotificationType.LEAD_CONSUMED, 'Lead Unlocked 🔓', bodyText, {});
    }
    async sendBroadcastNotification(title, body, data = {}) {
        const allCompanies = await this.companyRepository.find({ select: ['id'] });
        if (allCompanies.length > 0) {
            const notifications = allCompanies.map(company => this.notificationRepository.create({
                companyId: company.id,
                type: notification_entity_1.NotificationType.ADMIN_BROADCAST,
                title,
                body,
                data,
                isRead: false,
            }));
            await this.notificationRepository.save(notifications);
        }
        const allTokens = await this.expoPushTokenRepository.find({
            where: { isActive: true }
        });
        const pushTokens = allTokens.map((t) => t.token);
        if (pushTokens.length > 0) {
            await this.sendPushNotifications(pushTokens, title, body, {
                ...data,
                type: 'BROADCAST'
            });
        }
    }
    async getUserNotifications(companyId) {
        return this.notificationRepository.find({
            where: { companyId },
            order: { createdAt: 'DESC' },
        });
    }
    async getUnreadCount(companyId) {
        return this.notificationRepository.count({
            where: { companyId, isRead: false },
        });
    }
    async markAsRead(notificationIds) {
        if (notificationIds.length > 0) {
            await this.notificationRepository.update({ id: (0, typeorm_2.In)(notificationIds) }, { isRead: true });
        }
    }
    async markAllAsRead(companyId) {
        await this.notificationRepository.update({ companyId, isRead: false }, { isRead: true });
    }
    async deleteNotification(id, companyId) {
        await this.notificationRepository.delete({ id, companyId });
    }
    async deleteAllNotifications(companyId) {
        await this.notificationRepository.delete({ companyId });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(expo_push_token_entity_1.ExpoPushToken)),
    __param(2, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map