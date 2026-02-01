 // src/modules/notifications/notifications.service.ts


// import { Injectable, Logger, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Not, In } from 'typeorm';
// import { Notification, NotificationType } from './entities/notification.entity';
// import { ExpoPushToken } from './entities/expo-push-token.entity';
// import { Company } from '../company/entities/company.entity';
// import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// @Injectable()
// export class NotificationsService {
//   private readonly logger = new Logger(NotificationsService.name);
//   private expo: Expo;

//   constructor(
//     @InjectRepository(Notification)
//     private notificationRepository: Repository<Notification>,
//     @InjectRepository(ExpoPushToken)
//     private expoPushTokenRepository: Repository<ExpoPushToken>,
//     @InjectRepository(Company)
//     private companyRepository: Repository<Company>,
//   ) {
//     this.expo = new Expo();
//   }

//   /**
//    * Register or update a push token
//    */
//   async registerPushToken(
//     companyId: string,
//     token: string,
//     deviceId?: string,
//     platform?: string,
//   ): Promise<ExpoPushToken | null> {
//     try {
//       const existingToken = await this.expoPushTokenRepository.findOne({ where: { token } });

//       if (existingToken) {
//         existingToken.companyId = companyId;
//         existingToken.deviceId = deviceId;
//         existingToken.platform = platform || 'unknown';
//         existingToken.isActive = true;
//         return await this.expoPushTokenRepository.save(existingToken);
//       }

//       const newToken = this.expoPushTokenRepository.create({
//         companyId,
//         token,
//         deviceId,
//         platform: platform || 'unknown',
//         isActive: true,
//       });

//       return await this.expoPushTokenRepository.save(newToken);
//     } catch (error) {
//       this.logger.error(`Error registering token: ${error.message}`);
//       return null;
//     }
//   }

//   async unregisterPushToken(token: string): Promise<void> {
//     await this.expoPushTokenRepository.update({ token }, { isActive: false });
//   }

//   /**
//    * Internal helper for Expo Push
//    */
//   async sendPushNotifications(tokens: string[], title: string, body: string, data?: any): Promise<void> {
//     const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));
//     if (validTokens.length === 0) return;

//     const messages: ExpoPushMessage[] = validTokens.map(token => ({
//       to: token,
//       sound: 'default',
//       title,
//       body,
//       data: data || {},
//       priority: 'high',
//       channelId: 'default',
//     }));

//     const chunks = this.expo.chunkPushNotifications(messages);
//     for (const chunk of chunks) {
//       try {
//         await this.expo.sendPushNotificationsAsync(chunk);
//       } catch (error) {
//         this.logger.error('Error sending push chunk', error);
//       }
//     }
//   }

//   /**
//    * Create database notification record
//    */
//   async createNotification(
//     companyId: string, 
//     type: NotificationType, 
//     title: string, 
//     body: string, 
//     data?: any, 
//     leadId?: string
//   ): Promise<Notification> {
//     const notification = this.notificationRepository.create({ 
//       companyId, 
//       type, 
//       title, 
//       body, 
//       data: data || {}, 
//       leadId 
//     });
//     return await this.notificationRepository.save(notification);
//   }

//   // --- BUSINESS LOGIC METHODS ---

//   async sendNewLeadNotification(companyId: string, leadId: string, leadName: string): Promise<void> {
//     const title = 'New Lead Assigned! 🚀';
//     const body = `A new lead "${leadName}" has been assigned to you.`;
    
//     await this.createNotification(companyId, NotificationType.NEW_LEAD, title, body, { leadId }, leadId);

//     const tokens = await this.expoPushTokenRepository.find({ where: { companyId, isActive: true } });
//     const pushTokens = tokens.map(t => t.token);
//     await this.sendPushNotifications(pushTokens, title, body, { leadId, type: 'NEW_LEAD' });
//   }

//   async sendLeadConsumedNotification(companyId: string, leadId: string, leadName: string): Promise<void> {
//     const title = 'Lead Status Updated';
//     const body = `The lead "${leadName}" has been successfully processed.`;

//     // Note: If NotificationType.LEAD_UPDATE fails, check your entity for the correct enum name
//     await this.createNotification(companyId, NotificationType.NEW_LEAD, title, body, { leadId }, leadId);

//     const tokens = await this.expoPushTokenRepository.find({ where: { companyId, isActive: true } });
//     const pushTokens = tokens.map(t => t.token);
//     await this.sendPushNotifications(pushTokens, title, body, { leadId, type: 'LEAD_UPDATE' });
//   }

//   async sendBroadcastNotification(title: string, body: string, data?: any): Promise<void> {
//     const companies = await this.companyRepository.find({ where: { isDeleted: false } });
    
//     for (const company of companies) {
//       await this.createNotification(company.id, NotificationType.ADMIN_BROADCAST, title, body, data);
//     }

//     const tokens = await this.expoPushTokenRepository.find({ where: { isActive: true } });
//     const pushTokens = tokens.map(t => t.token);
//     await this.sendPushNotifications(pushTokens, title, body, { ...data, type: 'BROADCAST' });
//   }

//   // --- DATA MANAGEMENT METHODS ---

//   async getUserNotifications(companyId: string) {
//     return this.notificationRepository.find({ 
//       where: { companyId }, 
//       order: { createdAt: 'DESC' } 
//     });
//   }

//   async getUnreadCount(companyId: string) {
//     return this.notificationRepository.count({ where: { companyId, isRead: false } });
//   }

//   async markAsRead(notificationIds: string[]) {
//     if (notificationIds.length > 0) {
//       await this.notificationRepository.update({ id: In(notificationIds) }, { isRead: true });
//     }
//   }

//   async markAllAsRead(companyId: string): Promise<void> {
//     await this.notificationRepository.update({ companyId, isRead: false }, { isRead: true });
//   }

//   async deleteNotification(id: string, companyId: string): Promise<void> {
//     const result = await this.notificationRepository.delete({ id, companyId });
//     if (result.affected === 0) {
//       throw new NotFoundException(`Notification not found`);
//     }
//   }

//   async deleteAllNotifications(companyId: string): Promise<void> {
//     await this.notificationRepository.delete({ companyId });
//   }
// }

 // src/modules/notifications/notifications.service.ts
 import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';
import { Company } from '../company/entities/company.entity';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo = new Expo();

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(ExpoPushToken)
    private expoPushTokenRepository: Repository<ExpoPushToken>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  // ==========================================
  // 1. TOKEN MANAGEMENT
  // ==========================================

  async registerToken(
    companyId: string,
    token: string,
    deviceId?: string,
    platform?: string,
  ) {
    if (!Expo.isExpoPushToken(token)) {
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
    } else {
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

  async unregisterToken(token: string) {
    await this.expoPushTokenRepository.delete({ token });
  }

  // ==========================================
  // 2. SENDING NOTIFICATIONS (CORE LOGIC)
  // ==========================================

  private async sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data: any = {},
  ) {
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = [];

    for (const token of tokens) {
      if (!Expo.isExpoPushToken(token)) continue;
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
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        this.logger.error('❌ Error sending push notification chunk', error);
      }
    }
    
    return tickets;
  }

  async createNotification(
    companyId: string,
    type: NotificationType,
    title: string,
    body: string,
    data: any = {},
  ) {
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

  // ✅ FIX: Added optional arguments to match leads.service calls
  async sendNewLeadNotification(lead: any, messageOrTitle: string, companyId: string) {
    return this.createNotification(
      companyId,
      NotificationType.NEW_LEAD,
      'New Lead Alert 🚀',
      messageOrTitle || `New requirement posted: ${lead.title}`,
      { leadId: lead.id }
    );
  }

  // ✅ FIX: Added 3rd argument 'consumerName' to match leads.service calls
  async sendLeadConsumedNotification(companyId: string, leadTitle: string, consumerName?: string) {
    const bodyText = consumerName 
      ? `${consumerName} has viewed your lead: ${leadTitle}`
      : `Your lead "${leadTitle}" was viewed by a potential partner`;

    return this.createNotification(
      companyId,
      NotificationType.LEAD_CONSUMED,
      'Lead Unlocked 🔓',
      bodyText,
      {}
    );
  }

  async sendBroadcastNotification(title: string, body: string, data: any = {}) {
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

  // ==========================================
  // 3. USER ACTIONS
  // ==========================================

  async getUserNotifications(companyId: string) {
    return this.notificationRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCount(companyId: string) {
    return this.notificationRepository.count({
      where: { companyId, isRead: false },
    });
  }

  async markAsRead(notificationIds: string[]) {
    if (notificationIds.length > 0) {
      await this.notificationRepository.update(
        { id: In(notificationIds) },
        { isRead: true },
      );
    }
  }

  async markAllAsRead(companyId: string) {
    await this.notificationRepository.update(
      { companyId, isRead: false },
      { isRead: true },
    );
  }

  async deleteNotification(id: string, companyId: string) {
    await this.notificationRepository.delete({ id, companyId });
  }

  async deleteAllNotifications(companyId: string) {
    await this.notificationRepository.delete({ companyId });
  }
}