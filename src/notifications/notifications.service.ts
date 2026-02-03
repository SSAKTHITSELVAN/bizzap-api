//  // src/modules/notifications/notifications.service.ts
//  import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, In } from 'typeorm';
// import { Notification, NotificationType } from './entities/notification.entity';
// import { ExpoPushToken } from './entities/expo-push-token.entity';
// import { Company } from '../company/entities/company.entity';
// import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// @Injectable()
// export class NotificationsService {
//   private readonly logger = new Logger(NotificationsService.name);
//   private expo = new Expo();

//   constructor(
//     @InjectRepository(Notification)
//     private notificationRepository: Repository<Notification>,
//     @InjectRepository(ExpoPushToken)
//     private expoPushTokenRepository: Repository<ExpoPushToken>,
//     @InjectRepository(Company)
//     private companyRepository: Repository<Company>,
//   ) {}

//   // ==========================================
//   // 1. TOKEN MANAGEMENT
//   // ==========================================

//   async registerToken(
//     companyId: string,
//     token: string,
//     deviceId?: string,
//     platform?: string,
//   ) {
//     if (!Expo.isExpoPushToken(token)) {
//       this.logger.error(`Invalid Expo Push Token: ${token}`);
//       return null;
//     }

//     let tokenEntity = await this.expoPushTokenRepository.findOne({
//       where: { token },
//     });

//     if (tokenEntity) {
//       tokenEntity.companyId = companyId;
//       tokenEntity.deviceId = deviceId;
//       tokenEntity.platform = platform;
//       tokenEntity.isActive = true;
//       tokenEntity.updatedAt = new Date();
//     } else {
//       tokenEntity = this.expoPushTokenRepository.create({
//         companyId,
//         token,
//         deviceId,
//         platform,
//         isActive: true,
//       });
//     }

//     return this.expoPushTokenRepository.save(tokenEntity);
//   }

//   async unregisterToken(token: string) {
//     await this.expoPushTokenRepository.delete({ token });
//   }

//   // ==========================================
//   // 2. SENDING NOTIFICATIONS (CORE LOGIC)
//   // ==========================================

//   private async sendPushNotifications(
//     tokens: string[],
//     title: string,
//     body: string,
//     data: any = {},
//   ) {
//     if (tokens.length === 0) return;

//     const messages: ExpoPushMessage[] = [];

//     for (const token of tokens) {
//       if (!Expo.isExpoPushToken(token)) continue;
//       messages.push({
//         to: token,
//         sound: 'default',
//         title: title,
//         body: body,
//         data: data,
//         priority: 'high',
//         channelId: 'default',
//       });
//     }

//     const chunks = this.expo.chunkPushNotifications(messages);
//     const tickets: ExpoPushTicket[] = [];

//     for (const chunk of chunks) {
//       try {
//         const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
//         tickets.push(...ticketChunk);
//       } catch (error) {
//         this.logger.error('❌ Error sending push notification chunk', error);
//       }
//     }
    
//     return tickets;
//   }

//   async createNotification(
//     companyId: string,
//     type: NotificationType,
//     title: string,
//     body: string,
//     data: any = {},
//   ) {
//     const notification = this.notificationRepository.create({
//       companyId,
//       type,
//       title,
//       body,
//       data,
//       isRead: false,
//     });
//     await this.notificationRepository.save(notification);

//     const userTokens = await this.expoPushTokenRepository.find({
//       where: { companyId, isActive: true },
//     });
    
//     const pushTokens = userTokens.map((t) => t.token);
    
//     if (pushTokens.length > 0) {
//       await this.sendPushNotifications(pushTokens, title, body, { 
//         ...data, 
//         notificationId: notification.id,
//         type 
//       });
//     }

//     return notification;
//   }

//   // ✅ FIX: Added optional arguments to match leads.service calls
//   async sendNewLeadNotification(lead: any, messageOrTitle: string, companyId: string) {
//     return this.createNotification(
//       companyId,
//       NotificationType.NEW_LEAD,
//       'New Lead Alert 🚀',
//       messageOrTitle || `New requirement posted: ${lead.title}`,
//       { leadId: lead.id }
//     );
//   }

//   // ✅ FIX: Added 3rd argument 'consumerName' to match leads.service calls
//   async sendLeadConsumedNotification(companyId: string, leadTitle: string, consumerName?: string) {
//     const bodyText = consumerName 
//       ? `${consumerName} has viewed your lead: ${leadTitle}`
//       : `Your lead "${leadTitle}" was viewed by a potential partner`;

//     return this.createNotification(
//       companyId,
//       NotificationType.LEAD_CONSUMED,
//       'Lead Unlocked 🔓',
//       bodyText,
//       {}
//     );
//   }

//   async sendBroadcastNotification(title: string, body: string, data: any = {}) {
//     const allTokens = await this.expoPushTokenRepository.find({ 
//       where: { isActive: true } 
//     });
//     const pushTokens = allTokens.map((t) => t.token);

//     if (pushTokens.length > 0) {
//       await this.sendPushNotifications(pushTokens, title, body, {
//         ...data,
//         type: 'BROADCAST'
//       });
//     }
//   }

//   // ==========================================
//   // 3. USER ACTIONS
//   // ==========================================

//   async getUserNotifications(companyId: string) {
//     return this.notificationRepository.find({
//       where: { companyId },
//       order: { createdAt: 'DESC' },
//     });
//   }

//   async getUnreadCount(companyId: string) {
//     return this.notificationRepository.count({
//       where: { companyId, isRead: false },
//     });
//   }

//   async markAsRead(notificationIds: string[]) {
//     if (notificationIds.length > 0) {
//       await this.notificationRepository.update(
//         { id: In(notificationIds) },
//         { isRead: true },
//       );
//     }
//   }

//   async markAllAsRead(companyId: string) {
//     await this.notificationRepository.update(
//       { companyId, isRead: false },
//       { isRead: true },
//     );
//   }

//   async deleteNotification(id: string, companyId: string) {
//     await this.notificationRepository.delete({ id, companyId });
//   }

//   async deleteAllNotifications(companyId: string) {
//     await this.notificationRepository.delete({ companyId });
//   }
// }

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm'; // 👈 Added 'Not' import
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

  // ✅ FIX: Changed logic to Broadcast to EVERYONE EXCEPT CREATOR
  async sendNewLeadNotification(leadId: string, leadTitle: string, creatorCompanyId: string) {
    const title = 'New Lead Alert 🚀';
    const body = `New requirement posted: ${leadTitle}`;
    const data = { leadId, type: NotificationType.NEW_LEAD };

    this.logger.log(`📢 Broadcasting new lead to all except ${creatorCompanyId}`);

    // 1. Send Push to ALL users EXCEPT creator
    // We filter tokens where companyId is NOT the creator's ID
    const tokens = await this.expoPushTokenRepository.find({ 
      where: { 
        isActive: true,
        companyId: Not(creatorCompanyId) // 👈 This ensures creator doesn't get push
      } 
    });
    
    const pushTokens = tokens.map(t => t.token);

    if (pushTokens.length > 0) {
      await this.sendPushNotifications(pushTokens, title, body, data);
    }

    // 2. Create In-App Notifications for ALL active companies EXCEPT creator
    const companies = await this.companyRepository.find({
      where: { 
        id: Not(creatorCompanyId), // 👈 This ensures creator doesn't get in-app alert
        isDeleted: false
      },
      select: ['id']
    });

    if (companies.length > 0) {
      const notifications = companies.map(company => 
        this.notificationRepository.create({
          companyId: company.id,
          type: NotificationType.NEW_LEAD,
          title,
          body,
          data,
          isRead: false,
          leadId
        })
      );
      
      // Batch save for performance
      await this.notificationRepository.save(notifications);
    }
  }

  // This one stays the same (Targeted notification to lead owner)
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
    // 1. Create In-App for everyone
    const allCompanies = await this.companyRepository.find({ select: ['id'] });
    if (allCompanies.length > 0) {
        const notifications = allCompanies.map(company => 
            this.notificationRepository.create({
                companyId: company.id,
                type: NotificationType.ADMIN_BROADCAST,
                title,
                body,
                data,
                isRead: false,
            })
        );
        await this.notificationRepository.save(notifications);
    }

    // 2. Send Push to everyone
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