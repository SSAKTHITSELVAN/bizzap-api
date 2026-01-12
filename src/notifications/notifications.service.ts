// // src/modules/notifications/notifications.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Not, In } from 'typeorm';
// import { Notification, NotificationType } from './entities/notification.entity';
// import { ExpoPushToken } from './entities/expo-push-token.entity';
// import { Company } from '../company/entities/company.entity';
// import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

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
//     this.logger.log('NotificationsService initialized');
//   }

//   /**
//    * Register a user's Expo push token
//    * Handles both mobile (valid Expo tokens) and web (placeholder tokens)
//    */
//   async registerPushToken(
//     companyId: string,
//     token: string,
//     deviceId?: string,
//     platform?: string,
//   ): Promise<ExpoPushToken | null> {
//     this.logger.log(`Registering token for company ${companyId}, platform: ${platform || 'unknown'}`);

//     // For web, accept any token format
//     const isValidToken = platform === 'web' || Expo.isExpoPushToken(token);
    
//     if (!isValidToken) {
//       this.logger.warn(`Invalid Expo token: ${token}`);
//       return null;
//     }

//     const existingToken = await this.expoPushTokenRepository.findOne({
//       where: { token },
//     });

//     if (existingToken) {
//       this.logger.log(`Updating existing token for company ${companyId}`);
//       existingToken.companyId = companyId;
//       existingToken.deviceId = deviceId;
//       existingToken.platform = platform;
//       existingToken.isActive = true;
//       return await this.expoPushTokenRepository.save(existingToken);
//     }

//     this.logger.log(`Creating new token for company ${companyId}`);
//     const newToken = this.expoPushTokenRepository.create({
//       companyId,
//       token,
//       deviceId,
//       platform,
//       isActive: true, // Keep active even for web (for tracking purposes)
//     });

//     return await this.expoPushTokenRepository.save(newToken);
//   }

//   async unregisterPushToken(token: string): Promise<void> {
//     this.logger.log(`Unregistering token: ${token}`);
//     await this.expoPushTokenRepository.update({ token }, { isActive: false });
//   }

//   /**
//    * Get company tokens for push notifications (excludes web)
//    */
//   async getCompanyTokens(companyId: string): Promise<string[]> {
//     const tokens = await this.expoPushTokenRepository.find({
//       where: { 
//         companyId, 
//         isActive: true,
//       },
//     });
    
//     // Filter out web tokens and invalid tokens for push notifications
//     const validTokens = tokens
//       .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
//       .map(t => t.token);
    
//     this.logger.log(`Found ${validTokens.length} valid push tokens for company ${companyId}`);
//     return validTokens;
//   }

//   /**
//    * Send push notification to specific users (Android + iOS Compatible)
//    */
//   async sendPushNotifications(
//     tokens: string[],
//     title: string,
//     body: string,
//     data?: any,
//   ): Promise<void> {
//     const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

//     if (validTokens.length === 0) {
//       this.logger.log('No valid tokens to send push notifications');
//       return;
//     }

//     this.logger.log(`Sending push notification to ${validTokens.length} devices: "${title}"`);

//     // Create messages with cross-platform compatibility
//     const messages: ExpoPushMessage[] = validTokens.map(token => ({
//       to: token,
//       sound: 'default',
//       title,
//       body,
//       data: data || {},
//       priority: 'high',
//       channelId: 'default', // Required for Android 8.0+
//       badge: 1,
//       _displayInForeground: true,
//     }));

//     const chunks = this.expo.chunkPushNotifications(messages);
//     const tickets: ExpoPushTicket[] = [];

//     for (const chunk of chunks) {
//       try {
//         const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
//         tickets.push(...ticketChunk);
//       } catch (error) {
//         this.logger.error('Error sending push notifications chunk:', error);
//       }
//     }

//     // Handle invalid tokens
//     for (let i = 0; i < tickets.length; i++) {
//       const ticket = tickets[i];
//       if (ticket.status === 'error') {
//         this.logger.warn(`Push notification error for token ${i}:`, ticket.details);
//         if (ticket.details?.error === 'DeviceNotRegistered') {
//           await this.unregisterPushToken(validTokens[i]);
//         }
//       } else {
//         this.logger.log(`Push notification sent successfully to token ${i}`);
//       }
//     }
//   }

//   /**
//    * Create a notification record in database
//    */
//   async createNotification(
//     companyId: string,
//     type: NotificationType,
//     title: string,
//     body: string,
//     data?: any,
//     leadId?: string,
//   ): Promise<Notification> {
//     const notification = this.notificationRepository.create({
//       companyId,
//       type,
//       title,
//       body,
//       data: data || {},
//       leadId,
//     });

//     const saved = await this.notificationRepository.save(notification);
//     this.logger.log(`Created notification ${saved.id} for company ${companyId}`);
//     return saved;
//   }

//   /**
//    * BROADCAST: Send notification to ALL companies
//    * Creates database records for everyone + sends push to mobile devices
//    */
//   async sendBroadcastNotification(
//     title: string,
//     body: string,
//     data?: any,
//   ): Promise<void> {
//     try {
//       this.logger.log('=== STARTING BROADCAST NOTIFICATION ===');
//       this.logger.log(`Title: "${title}"`);
//       this.logger.log(`Body: "${body}"`);

//       // Step 1: Get ALL non-deleted companies
//       const allCompanies = await this.companyRepository.find({ 
//         where: { isDeleted: false },
//         select: ['id', 'companyName'], // Only select what we need
//       });
      
//       this.logger.log(`✅ Step 1: Found ${allCompanies.length} active companies`);
      
//       if (allCompanies.length === 0) {
//         this.logger.warn('❌ No companies found in database');
//         return;
//       }

//       // Step 2: Create database notification for EVERY company
//       this.logger.log(`📝 Step 2: Creating ${allCompanies.length} database notifications...`);
      
//       const dbPromises = allCompanies.map(company => 
//         this.createNotification(
//           company.id,
//           NotificationType.ADMIN_BROADCAST,
//           title,
//           body,
//           data || {},
//         )
//       );
      
//       const createdNotifications = await Promise.all(dbPromises);
//       this.logger.log(`✅ Step 2 Complete: Created ${createdNotifications.length} database notifications`);

//       // Step 3: Send push notifications to mobile devices only
//       this.logger.log('📱 Step 3: Sending push notifications to mobile devices...');
      
//       const activeTokens = await this.expoPushTokenRepository.find({ 
//         where: { 
//           isActive: true,
//         } 
//       });
      
//       this.logger.log(`Found ${activeTokens.length} total active tokens`);
      
//       // Filter to only mobile tokens (exclude web)
//       const mobileTokens = activeTokens
//         .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
//         .map(t => t.token);
      
//       this.logger.log(`Filtered to ${mobileTokens.length} valid mobile push tokens`);
      
//       if (mobileTokens.length > 0) {
//         await this.sendPushNotifications(
//           mobileTokens,
//           title,
//           body,
//           { ...data, type: 'ADMIN_BROADCAST' },
//         );
//         this.logger.log(`✅ Step 3 Complete: Push notifications sent to ${mobileTokens.length} mobile devices`);
//       } else {
//         this.logger.log('⚠️ Step 3: No mobile devices to send push notifications');
//       }

//       this.logger.log('=== BROADCAST NOTIFICATION COMPLETED SUCCESSFULLY ===');
//       this.logger.log(`Summary: ${createdNotifications.length} DB records, ${mobileTokens.length} push notifications`);
//     } catch (error) {
//       this.logger.error('❌ BROADCAST ERROR:', error);
//       throw error;
//     }
//   }

//   /**
//    * Send notification when a new lead is posted
//    * Notifies all companies except the creator
//    */
//   async sendNewLeadNotification(
//     leadId: string,
//     leadTitle: string,
//     creatorCompanyId: string,
//   ): Promise<void> {
//     try {
//       this.logger.log(`[NewLead] Sending notification for lead: ${leadId}`);

//       // Get all companies except the creator
//       const allCompanies = await this.companyRepository.find({
//         where: { 
//           id: Not(creatorCompanyId),
//           isDeleted: false,
//         },
//         select: ['id'],
//       });

//       if (allCompanies.length === 0) {
//         this.logger.log('[NewLead] No other companies to notify');
//         return;
//       }

//       this.logger.log(`[NewLead] Creating notifications for ${allCompanies.length} companies`);

//       // Create DB notifications for ALL companies
//       const dbPromises = allCompanies.map(company =>
//         this.createNotification(
//           company.id,
//           NotificationType.NEW_LEAD,
//           '📣 New Lead Available',
//           leadTitle,
//           { leadId, screen: 'LeadDetails' },
//           leadId,
//         ),
//       );

//       await Promise.all(dbPromises);
//       this.logger.log(`[NewLead] ✅ Created ${allCompanies.length} database notifications`);

//       // Send push notifications to mobile devices
//       const tokens = await this.expoPushTokenRepository.find({
//         where: { 
//           companyId: Not(creatorCompanyId), 
//           isActive: true,
//         },
//       });

//       const mobileTokens = tokens
//         .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
//         .map(t => t.token);

//       if (mobileTokens.length > 0) {
//         await this.sendPushNotifications(
//           mobileTokens,
//           '📣 New Lead Available',
//           leadTitle,
//           { type: 'NEW_LEAD', leadId, screen: 'LeadDetails' },
//         );
//         this.logger.log(`[NewLead] ✅ Sent push to ${mobileTokens.length} mobile devices`);
//       } else {
//         this.logger.log('[NewLead] No mobile devices to notify');
//       }
//     } catch (error) {
//       this.logger.error('[NewLead] Error:', error);
//     }
//   }

//   /**
//    * Notify lead owner when their lead is consumed
//    */
//   async sendLeadConsumedNotification(
//     leadOwnerId: string,
//     leadTitle: string,
//     consumerCompanyName: string,
//   ): Promise<void> {
//     try {
//       this.logger.log(`[LeadConsumed] Notifying owner: ${leadOwnerId}`);

//       // Create DB Entry
//       await this.createNotification(
//         leadOwnerId,
//         NotificationType.LEAD_CONSUMED,
//         '🤝 Lead Consumed',
//         `${consumerCompanyName} viewed your lead: ${leadTitle}`,
//         { screen: 'MyLeads' },
//       );
//       this.logger.log('[LeadConsumed] ✅ Database notification created');

//       // Send Push to mobile devices
//       const tokens = await this.getCompanyTokens(leadOwnerId);
//       if (tokens.length > 0) {
//         await this.sendPushNotifications(
//           tokens,
//           '🤝 Lead Consumed',
//           `${consumerCompanyName} viewed your lead: ${leadTitle}`,
//           { type: 'LEAD_CONSUMED', screen: 'MyLeads' },
//         );
//         this.logger.log(`[LeadConsumed] ✅ Push sent to ${tokens.length} devices`);
//       } else {
//         this.logger.log('[LeadConsumed] No mobile devices to notify');
//       }
//     } catch (error) {
//       this.logger.error('[LeadConsumed] Error:', error);
//     }
//   }

//   // ==========================================
//   // STANDARD NOTIFICATION CRUD METHODS
//   // ==========================================

//   async getUserNotifications(companyId: string): Promise<Notification[]> {
//     const notifications = await this.notificationRepository.find({
//       where: { companyId },
//       order: { createdAt: 'DESC' },
//     });
    
//     this.logger.log(`Retrieved ${notifications.length} notifications for company ${companyId}`);
//     return notifications;
//   }

//   async getUnreadCount(companyId: string): Promise<number> {
//     const count = await this.notificationRepository.count({
//       where: { companyId, isRead: false },
//     });
    
//     this.logger.log(`Company ${companyId} has ${count} unread notifications`);
//     return count;
//   }

//   async markAsRead(notificationIds: string[]): Promise<void> {
//     if (notificationIds.length === 0) return;
    
//     await this.notificationRepository.update(
//       { id: In(notificationIds) },
//       { isRead: true },
//     );
    
//     this.logger.log(`Marked ${notificationIds.length} notifications as read`);
//   }

//   async markAllAsRead(companyId: string): Promise<void> {
//     const result = await this.notificationRepository.update(
//       { companyId, isRead: false },
//       { isRead: true },
//     );
    
//     this.logger.log(`Marked all notifications as read for company ${companyId} (${result.affected} affected)`);
//   }

//   async deleteNotification(notificationId: string, companyId: string): Promise<void> {
//     await this.notificationRepository.delete({ id: notificationId, companyId });
//     this.logger.log(`Deleted notification ${notificationId} for company ${companyId}`);
//   }

//   async deleteAllNotifications(companyId: string): Promise<void> {
//     const result = await this.notificationRepository.delete({ companyId });
//     this.logger.log(`Deleted all notifications for company ${companyId} (${result.affected} deleted)`);
//   }
// }

// src/modules/notifications/notifications.service.ts - FIXED FOR ALL PLATFORMS
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';
import { Company } from '../company/entities/company.entity';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo: Expo;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(ExpoPushToken)
    private expoPushTokenRepository: Repository<ExpoPushToken>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {
    this.expo = new Expo();
    this.logger.log('NotificationsService initialized');
  }

  /**
   * Register a user's Expo push token
   * ✅ NOW ACCEPTS ALL TOKENS (web, mobile, placeholder) for database tracking
   * Only validates for actual push notifications
   */
  async registerPushToken(
    companyId: string,
    token: string,
    deviceId?: string,
    platform?: string,
  ): Promise<ExpoPushToken | null> {
    try {
      this.logger.log(`Registering token for company ${companyId}, platform: ${platform || 'unknown'}`);

      // ✅ ALWAYS accept the token for database storage
      // We'll filter by platform when sending actual push notifications
      
      const existingToken = await this.expoPushTokenRepository.findOne({
        where: { token },
      });

      if (existingToken) {
        this.logger.log(`Updating existing token for company ${companyId}`);
        existingToken.companyId = companyId;
        existingToken.deviceId = deviceId;
        existingToken.platform = platform || 'unknown';
        existingToken.isActive = true;
        return await this.expoPushTokenRepository.save(existingToken);
      }

      this.logger.log(`Creating new token for company ${companyId}`);
      const newToken = this.expoPushTokenRepository.create({
        companyId,
        token,
        deviceId,
        platform: platform || 'unknown',
        isActive: true,
      });

      const saved = await this.expoPushTokenRepository.save(newToken);
      this.logger.log(`✅ Token registered successfully for company ${companyId}`);
      return saved;
    } catch (error) {
      this.logger.error(`❌ Error registering token for company ${companyId}:`, error);
      // ✅ Return null instead of throwing - don't crash the app
      return null;
    }
  }

  async unregisterPushToken(token: string): Promise<void> {
    try {
      this.logger.log(`Unregistering token: ${token}`);
      await this.expoPushTokenRepository.update({ token }, { isActive: false });
    } catch (error) {
      this.logger.error('Error unregistering token:', error);
      // Don't throw
    }
  }

  /**
   * Get company tokens for PUSH notifications (mobile only - excludes web/invalid)
   */
  async getCompanyPushTokens(companyId: string): Promise<string[]> {
    try {
      const tokens = await this.expoPushTokenRepository.find({
        where: { 
          companyId, 
          isActive: true,
        },
      });
      
      // ✅ Filter to only valid mobile push tokens
      const validPushTokens = tokens
        .filter(t => 
          t.platform !== 'web' && 
          t.platform !== 'unknown' &&
          Expo.isExpoPushToken(t.token)
        )
        .map(t => t.token);
      
      this.logger.log(`Found ${validPushTokens.length} valid PUSH tokens for company ${companyId}`);
      return validPushTokens;
    } catch (error) {
      this.logger.error(`Error getting push tokens for company ${companyId}:`, error);
      return [];
    }
  }

  /**
   * Send push notification to mobile devices (Android + iOS Compatible)
   * ✅ Safely handles errors - never crashes
   */
  async sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    try {
      const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

      if (validTokens.length === 0) {
        this.logger.log('No valid tokens to send push notifications');
        return;
      }

      this.logger.log(`Sending push notification to ${validTokens.length} devices: "${title}"`);

      const messages: ExpoPushMessage[] = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
        channelId: 'default',
        badge: 1,
        _displayInForeground: true,
      }));

      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          this.logger.error('Error sending push notification chunk:', error);
          // Continue with other chunks
        }
      }

      // Handle invalid tokens
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'error') {
          this.logger.warn(`Push error for token ${i}:`, ticket.details);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.unregisterPushToken(validTokens[i]);
          }
        }
      }

      this.logger.log(`✅ Push notifications sent successfully`);
    } catch (error) {
      this.logger.error('❌ Error in sendPushNotifications:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Create a notification record in database
   * ✅ ALWAYS works regardless of push notification status
   */
  async createNotification(
    companyId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
    leadId?: string,
  ): Promise<Notification> {
    try {
      const notification = this.notificationRepository.create({
        companyId,
        type,
        title,
        body,
        data: data || {},
        leadId,
      });

      const saved = await this.notificationRepository.save(notification);
      this.logger.log(`✅ Created notification ${saved.id} for company ${companyId}`);
      return saved;
    } catch (error) {
      this.logger.error(`❌ Error creating notification for company ${companyId}:`, error);
      throw error; // This one should throw since it's a database operation
    }
  }

  /**
   * BROADCAST: Send notification to ALL companies
   * ✅ Creates database records for EVERYONE (web + mobile)
   * ✅ Sends push ONLY to valid mobile tokens
   */
  async sendBroadcastNotification(
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    try {
      this.logger.log('=== STARTING BROADCAST NOTIFICATION ===');
      this.logger.log(`Title: "${title}"`);
      this.logger.log(`Body: "${body}"`);

      // Step 1: Get ALL companies
      const allCompanies = await this.companyRepository.find({ 
        where: { isDeleted: false },
        select: ['id', 'companyName'],
      });
      
      this.logger.log(`✅ Step 1: Found ${allCompanies.length} active companies`);
      
      if (allCompanies.length === 0) {
        this.logger.warn('❌ No companies found');
        return;
      }

      // Step 2: Create database notification for EVERY company (web + mobile)
      this.logger.log(`📝 Step 2: Creating ${allCompanies.length} database notifications...`);
      
      const dbPromises = allCompanies.map(company => 
        this.createNotification(
          company.id,
          NotificationType.ADMIN_BROADCAST,
          title,
          body,
          data || {},
        ).catch(err => {
          this.logger.error(`Error creating notification for ${company.id}:`, err);
          return null; // Don't fail entire broadcast
        })
      );
      
      const createdNotifications = (await Promise.all(dbPromises)).filter(n => n !== null);
      this.logger.log(`✅ Step 2: Created ${createdNotifications.length} database notifications`);

      // Step 3: Send push ONLY to valid mobile tokens
      this.logger.log('📱 Step 3: Sending push to mobile devices...');
      
      const activeTokens = await this.expoPushTokenRepository.find({ 
        where: { isActive: true } 
      });
      
      this.logger.log(`Found ${activeTokens.length} total active tokens`);
      
      const mobileTokens = activeTokens
        .filter(t => 
          t.platform !== 'web' && 
          t.platform !== 'unknown' &&
          Expo.isExpoPushToken(t.token)
        )
        .map(t => t.token);
      
      this.logger.log(`Filtered to ${mobileTokens.length} valid mobile push tokens`);
      
      if (mobileTokens.length > 0) {
        await this.sendPushNotifications(
          mobileTokens,
          title,
          body,
          { ...data, type: 'ADMIN_BROADCAST' },
        );
      } else {
        this.logger.log('⚠️ No mobile devices for push');
      }

      this.logger.log('=== BROADCAST COMPLETED ===');
      this.logger.log(`Summary: ${createdNotifications.length} DB records, ${mobileTokens.length} push sent`);
    } catch (error) {
      this.logger.error('❌ BROADCAST ERROR:', error);
      // Don't throw - partial success is OK
    }
  }

  /**
   * Send notification when a new lead is posted
   * ✅ Database records for ALL users (web + mobile)
   * ✅ Push only to mobile devices
   */
  async sendNewLeadNotification(
    leadId: string,
    leadTitle: string,
    creatorCompanyId: string,
  ): Promise<void> {
    try {
      this.logger.log(`[NewLead] Sending notification for lead: ${leadId}`);

      const allCompanies = await this.companyRepository.find({
        where: { 
          id: Not(creatorCompanyId),
          isDeleted: false,
        },
        select: ['id'],
      });

      if (allCompanies.length === 0) {
        this.logger.log('[NewLead] No companies to notify');
        return;
      }

      this.logger.log(`[NewLead] Creating notifications for ${allCompanies.length} companies`);

      // Create DB notifications for ALL
      const dbPromises = allCompanies.map(company =>
        this.createNotification(
          company.id,
          NotificationType.NEW_LEAD,
          '📣 New Lead Available',
          leadTitle,
          { leadId, screen: 'LeadDetails' },
          leadId,
        ).catch(err => {
          this.logger.error(`Error creating notification for ${company.id}:`, err);
          return null;
        })
      );

      const created = (await Promise.all(dbPromises)).filter(n => n !== null);
      this.logger.log(`[NewLead] ✅ Created ${created.length} database notifications`);

      // Send push to mobile only
      const tokens = await this.expoPushTokenRepository.find({
        where: { 
          companyId: Not(creatorCompanyId), 
          isActive: true,
        },
      });

      const mobileTokens = tokens
        .filter(t => 
          t.platform !== 'web' && 
          t.platform !== 'unknown' &&
          Expo.isExpoPushToken(t.token)
        )
        .map(t => t.token);

      if (mobileTokens.length > 0) {
        await this.sendPushNotifications(
          mobileTokens,
          '📣 New Lead Available',
          leadTitle,
          { type: 'NEW_LEAD', leadId, screen: 'LeadDetails' },
        );
        this.logger.log(`[NewLead] ✅ Push sent to ${mobileTokens.length} mobile devices`);
      }
    } catch (error) {
      this.logger.error('[NewLead] Error:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Notify lead owner when their lead is consumed
   */
  async sendLeadConsumedNotification(
    leadOwnerId: string,
    leadTitle: string,
    consumerCompanyName: string,
  ): Promise<void> {
    try {
      this.logger.log(`[LeadConsumed] Notifying owner: ${leadOwnerId}`);

      // Create DB notification
      await this.createNotification(
        leadOwnerId,
        NotificationType.LEAD_CONSUMED,
        '🤝 Lead Consumed',
        `${consumerCompanyName} viewed your lead: ${leadTitle}`,
        { screen: 'MyLeads' },
      );

      // Send push to mobile
      const tokens = await this.getCompanyPushTokens(leadOwnerId);
      if (tokens.length > 0) {
        await this.sendPushNotifications(
          tokens,
          '🤝 Lead Consumed',
          `${consumerCompanyName} viewed your lead: ${leadTitle}`,
          { type: 'LEAD_CONSUMED', screen: 'MyLeads' },
        );
      }
    } catch (error) {
      this.logger.error('[LeadConsumed] Error:', error);
    }
  }

  // ==========================================
  // CRUD METHODS - ALL WITH ERROR HANDLING
  // ==========================================

  async getUserNotifications(companyId: string): Promise<Notification[]> {
    try {
      const notifications = await this.notificationRepository.find({
        where: { companyId },
        order: { createdAt: 'DESC' },
      });
      
      this.logger.log(`Retrieved ${notifications.length} notifications for company ${companyId}`);
      return notifications;
    } catch (error) {
      this.logger.error(`Error getting notifications for company ${companyId}:`, error);
      return []; // Return empty array instead of crashing
    }
  }

  async getUnreadCount(companyId: string): Promise<number> {
    try {
      const count = await this.notificationRepository.count({
        where: { companyId, isRead: false },
      });
      
      this.logger.log(`Company ${companyId} has ${count} unread notifications`);
      return count;
    } catch (error) {
      this.logger.error(`Error getting unread count for company ${companyId}:`, error);
      return 0;
    }
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    try {
      if (notificationIds.length === 0) return;
      
      await this.notificationRepository.update(
        { id: In(notificationIds) },
        { isRead: true },
      );
      
      this.logger.log(`Marked ${notificationIds.length} notifications as read`);
    } catch (error) {
      this.logger.error('Error marking notifications as read:', error);
      // Don't throw
    }
  }

  async markAllAsRead(companyId: string): Promise<void> {
    try {
      const result = await this.notificationRepository.update(
        { companyId, isRead: false },
        { isRead: true },
      );
      
      this.logger.log(`Marked all notifications as read for company ${companyId} (${result.affected} affected)`);
    } catch (error) {
      this.logger.error(`Error marking all as read for company ${companyId}:`, error);
    }
  }

  async deleteNotification(notificationId: string, companyId: string): Promise<void> {
    try {
      await this.notificationRepository.delete({ id: notificationId, companyId });
      this.logger.log(`Deleted notification ${notificationId}`);
    } catch (error) {
      this.logger.error(`Error deleting notification ${notificationId}:`, error);
    }
  }

  async deleteAllNotifications(companyId: string): Promise<void> {
    try {
      const result = await this.notificationRepository.delete({ companyId });
      this.logger.log(`Deleted all notifications for company ${companyId} (${result.affected} deleted)`);
    } catch (error) {
      this.logger.error(`Error deleting all notifications for company ${companyId}:`, error);
    }
  }
}