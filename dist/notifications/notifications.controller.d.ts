import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';
import { SendBroadcastDto } from './dto/send-broadcast.dto';
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    registerToken(req: any, registerTokenDto: RegisterTokenDto): Promise<{
        message: string;
        data: import("./entities/expo-push-token.entity").ExpoPushToken | null;
    }>;
    unregisterToken(token: string): Promise<{
        message: string;
    }>;
    getUserNotifications(req: any): Promise<import("./entities/notification.entity").Notification[]>;
    getUnreadCount(req: any): Promise<{
        count: number;
    }>;
    markAsRead(dto: MarkNotificationReadDto): Promise<{
        success: boolean;
    }>;
    markAllAsRead(req: any): Promise<{
        success: boolean;
    }>;
    deleteAllNotifications(req: any): Promise<{
        success: boolean;
    }>;
    sendBroadcast(broadcastDto: SendBroadcastDto): Promise<{
        message: string;
    }>;
}
