import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';
import { Company } from '../company/entities/company.entity';
export declare class NotificationsService {
    private notificationRepository;
    private expoPushTokenRepository;
    private companyRepository;
    private readonly logger;
    private expo;
    constructor(notificationRepository: Repository<Notification>, expoPushTokenRepository: Repository<ExpoPushToken>, companyRepository: Repository<Company>);
    registerToken(companyId: string, token: string, deviceId?: string, platform?: string): Promise<ExpoPushToken | null>;
    unregisterToken(token: string): Promise<void>;
    private sendPushNotifications;
    createNotification(companyId: string, type: NotificationType, title: string, body: string, data?: any): Promise<Notification>;
    sendNewLeadNotification(leadId: string, leadTitle: string, creatorCompanyId: string): Promise<void>;
    sendLeadConsumedNotification(companyId: string, leadTitle: string, consumerName?: string): Promise<Notification>;
    sendBroadcastNotification(title: string, body: string, data?: any): Promise<void>;
    getUserNotifications(companyId: string): Promise<Notification[]>;
    getUnreadCount(companyId: string): Promise<number>;
    markAsRead(notificationIds: string[]): Promise<void>;
    markAllAsRead(companyId: string): Promise<void>;
    deleteNotification(id: string, companyId: string): Promise<void>;
    deleteAllNotifications(companyId: string): Promise<void>;
}
