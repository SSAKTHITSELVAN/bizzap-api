// // // // src/modules/notifications/notifications.service.ts
// // // import { Injectable, Logger } from '@nestjs/common';
// // // import { InjectRepository } from '@nestjs/typeorm';
// // // import { Repository, Not, In } from 'typeorm';
// // // import { Notification, NotificationType } from './entities/notification.entity';
// // // import { ExpoPushToken } from './entities/expo-push-token.entity';
// // // import { Company } from '../company/entities/company.entity';
// // // import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// // // @Injectable()
// // // export class NotificationsService {
// // //   private readonly logger = new Logger(NotificationsService.name);
// // //   private expo: Expo;

// // //   constructor(
// // //     @InjectRepository(Notification)
// // //     private notificationRepository: Repository<Notification>,
// // //     @InjectRepository(ExpoPushToken)
// // //     private expoPushTokenRepository: Repository<ExpoPushToken>,
// // //     @InjectRepository(Company)
// // //     private companyRepository: Repository<Company>,
// // //   ) {
// // //     this.expo = new Expo();
// // //     this.logger.log('NotificationsService initialized');
// // //   }

// // //   /**
// // //    * Register a user's Expo push token
// // //    * Handles both mobile (valid Expo tokens) and web (placeholder tokens)
// // //    */
// // //   async registerPushToken(
// // //     companyId: string,
// // //     token: string,
// // //     deviceId?: string,
// // //     platform?: string,
// // //   ): Promise<ExpoPushToken | null> {
// // //     this.logger.log(`Registering token for company ${companyId}, platform: ${platform || 'unknown'}`);

// // //     // For web, accept any token format
// // //     const isValidToken = platform === 'web' || Expo.isExpoPushToken(token);
    
// // //     if (!isValidToken) {
// // //       this.logger.warn(`Invalid Expo token: ${token}`);
// // //       return null;
// // //     }

// // //     const existingToken = await this.expoPushTokenRepository.findOne({
// // //       where: { token },
// // //     });

// // //     if (existingToken) {
// // //       this.logger.log(`Updating existing token for company ${companyId}`);
// // //       existingToken.companyId = companyId;
// // //       existingToken.deviceId = deviceId;
// // //       existingToken.platform = platform;
// // //       existingToken.isActive = true;
// // //       return await this.expoPushTokenRepository.save(existingToken);
// // //     }

// // //     this.logger.log(`Creating new token for company ${companyId}`);
// // //     const newToken = this.expoPushTokenRepository.create({
// // //       companyId,
// // //       token,
// // //       deviceId,
// // //       platform,
// // //       isActive: true, // Keep active even for web (for tracking purposes)
// // //     });

// // //     return await this.expoPushTokenRepository.save(newToken);
// // //   }

// // //   async unregisterPushToken(token: string): Promise<void> {
// // //     this.logger.log(`Unregistering token: ${token}`);
// // //     await this.expoPushTokenRepository.update({ token }, { isActive: false });
// // //   }

// // //   /**
// // //    * Get company tokens for push notifications (excludes web)
// // //    */
// // //   async getCompanyTokens(companyId: string): Promise<string[]> {
// // //     const tokens = await this.expoPushTokenRepository.find({
// // //       where: { 
// // //         companyId, 
// // //         isActive: true,
// // //       },
// // //     });
    
// // //     // Filter out web tokens and invalid tokens for push notifications
// // //     const validTokens = tokens
// // //       .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
// // //       .map(t => t.token);
    
// // //     this.logger.log(`Found ${validTokens.length} valid push tokens for company ${companyId}`);
// // //     return validTokens;
// // //   }

// // //   /**
// // //    * Send push notification to specific users (Android + iOS Compatible)
// // //    */
// // //   async sendPushNotifications(
// // //     tokens: string[],
// // //     title: string,
// // //     body: string,
// // //     data?: any,
// // //   ): Promise<void> {
// // //     const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

// // //     if (validTokens.length === 0) {
// // //       this.logger.log('No valid tokens to send push notifications');
// // //       return;
// // //     }

// // //     this.logger.log(`Sending push notification to ${validTokens.length} devices: "${title}"`);

// // //     // Create messages with cross-platform compatibility
// // //     const messages: ExpoPushMessage[] = validTokens.map(token => ({
// // //       to: token,
// // //       sound: 'default',
// // //       title,
// // //       body,
// // //       data: data || {},
// // //       priority: 'high',
// // //       channelId: 'default', // Required for Android 8.0+
// // //       badge: 1,
// // //       _displayInForeground: true,
// // //     }));

// // //     const chunks = this.expo.chunkPushNotifications(messages);
// // //     const tickets: ExpoPushTicket[] = [];

// // //     for (const chunk of chunks) {
// // //       try {
// // //         const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
// // //         tickets.push(...ticketChunk);
// // //       } catch (error) {
// // //         this.logger.error('Error sending push notifications chunk:', error);
// // //       }
// // //     }

// // //     // Handle invalid tokens
// // //     for (let i = 0; i < tickets.length; i++) {
// // //       const ticket = tickets[i];
// // //       if (ticket.status === 'error') {
// // //         this.logger.warn(`Push notification error for token ${i}:`, ticket.details);
// // //         if (ticket.details?.error === 'DeviceNotRegistered') {
// // //           await this.unregisterPushToken(validTokens[i]);
// // //         }
// // //       } else {
// // //         this.logger.log(`Push notification sent successfully to token ${i}`);
// // //       }
// // //     }
// // //   }

// // //   /**
// // //    * Create a notification record in database
// // //    */
// // //   async createNotification(
// // //     companyId: string,
// // //     type: NotificationType,
// // //     title: string,
// // //     body: string,
// // //     data?: any,
// // //     leadId?: string,
// // //   ): Promise<Notification> {
// // //     const notification = this.notificationRepository.create({
// // //       companyId,
// // //       type,
// // //       title,
// // //       body,
// // //       data: data || {},
// // //       leadId,
// // //     });

// // //     const saved = await this.notificationRepository.save(notification);
// // //     this.logger.log(`Created notification ${saved.id} for company ${companyId}`);
// // //     return saved;
// // //   }

// // //   /**
// // //    * BROADCAST: Send notification to ALL companies
// // //    * Creates database records for everyone + sends push to mobile devices
// // //    */
// // //   async sendBroadcastNotification(
// // //     title: string,
// // //     body: string,
// // //     data?: any,
// // //   ): Promise<void> {
// // //     try {
// // //       this.logger.log('=== STARTING BROADCAST NOTIFICATION ===');
// // //       this.logger.log(`Title: "${title}"`);
// // //       this.logger.log(`Body: "${body}"`);

// // //       // Step 1: Get ALL non-deleted companies
// // //       const allCompanies = await this.companyRepository.find({ 
// // //         where: { isDeleted: false },
// // //         select: ['id', 'companyName'], // Only select what we need
// // //       });
      
// // //       this.logger.log(`✅ Step 1: Found ${allCompanies.length} active companies`);
      
// // //       if (allCompanies.length === 0) {
// // //         this.logger.warn('❌ No companies found in database');
// // //         return;
// // //       }

// // //       // Step 2: Create database notification for EVERY company
// // //       this.logger.log(`📝 Step 2: Creating ${allCompanies.length} database notifications...`);
      
// // //       const dbPromises = allCompanies.map(company => 
// // //         this.createNotification(
// // //           company.id,
// // //           NotificationType.ADMIN_BROADCAST,
// // //           title,
// // //           body,
// // //           data || {},
// // //         )
// // //       );
      
// // //       const createdNotifications = await Promise.all(dbPromises);
// // //       this.logger.log(`✅ Step 2 Complete: Created ${createdNotifications.length} database notifications`);

// // //       // Step 3: Send push notifications to mobile devices only
// // //       this.logger.log('📱 Step 3: Sending push notifications to mobile devices...');
      
// // //       const activeTokens = await this.expoPushTokenRepository.find({ 
// // //         where: { 
// // //           isActive: true,
// // //         } 
// // //       });
      
// // //       this.logger.log(`Found ${activeTokens.length} total active tokens`);
      
// // //       // Filter to only mobile tokens (exclude web)
// // //       const mobileTokens = activeTokens
// // //         .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
// // //         .map(t => t.token);
      
// // //       this.logger.log(`Filtered to ${mobileTokens.length} valid mobile push tokens`);
      
// // //       if (mobileTokens.length > 0) {
// // //         await this.sendPushNotifications(
// // //           mobileTokens,
// // //           title,
// // //           body,
// // //           { ...data, type: 'ADMIN_BROADCAST' },
// // //         );
// // //         this.logger.log(`✅ Step 3 Complete: Push notifications sent to ${mobileTokens.length} mobile devices`);
// // //       } else {
// // //         this.logger.log('⚠️ Step 3: No mobile devices to send push notifications');
// // //       }

// // //       this.logger.log('=== BROADCAST NOTIFICATION COMPLETED SUCCESSFULLY ===');
// // //       this.logger.log(`Summary: ${createdNotifications.length} DB records, ${mobileTokens.length} push notifications`);
// // //     } catch (error) {
// // //       this.logger.error('❌ BROADCAST ERROR:', error);
// // //       throw error;
// // //     }
// // //   }

// // //   /**
// // //    * Send notification when a new lead is posted
// // //    * Notifies all companies except the creator
// // //    */
// // //   async sendNewLeadNotification(
// // //     leadId: string,
// // //     leadTitle: string,
// // //     creatorCompanyId: string,
// // //   ): Promise<void> {
// // //     try {
// // //       this.logger.log(`[NewLead] Sending notification for lead: ${leadId}`);

// // //       // Get all companies except the creator
// // //       const allCompanies = await this.companyRepository.find({
// // //         where: { 
// // //           id: Not(creatorCompanyId),
// // //           isDeleted: false,
// // //         },
// // //         select: ['id'],
// // //       });

// // //       if (allCompanies.length === 0) {
// // //         this.logger.log('[NewLead] No other companies to notify');
// // //         return;
// // //       }

// // //       this.logger.log(`[NewLead] Creating notifications for ${allCompanies.length} companies`);

// // //       // Create DB notifications for ALL companies
// // //       const dbPromises = allCompanies.map(company =>
// // //         this.createNotification(
// // //           company.id,
// // //           NotificationType.NEW_LEAD,
// // //           '📣 New Lead Available',
// // //           leadTitle,
// // //           { leadId, screen: 'LeadDetails' },
// // //           leadId,
// // //         ),
// // //       );

// // //       await Promise.all(dbPromises);
// // //       this.logger.log(`[NewLead] ✅ Created ${allCompanies.length} database notifications`);

// // //       // Send push notifications to mobile devices
// // //       const tokens = await this.expoPushTokenRepository.find({
// // //         where: { 
// // //           companyId: Not(creatorCompanyId), 
// // //           isActive: true,
// // //         },
// // //       });

// // //       const mobileTokens = tokens
// // //         .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
// // //         .map(t => t.token);

// // //       if (mobileTokens.length > 0) {
// // //         await this.sendPushNotifications(
// // //           mobileTokens,
// // //           '📣 New Lead Available',
// // //           leadTitle,
// // //           { type: 'NEW_LEAD', leadId, screen: 'LeadDetails' },
// // //         );
// // //         this.logger.log(`[NewLead] ✅ Sent push to ${mobileTokens.length} mobile devices`);
// // //       } else {
// // //         this.logger.log('[NewLead] No mobile devices to notify');
// // //       }
// // //     } catch (error) {
// // //       this.logger.error('[NewLead] Error:', error);
// // //     }
// // //   }

// // //   /**
// // //    * Notify lead owner when their lead is consumed
// // //    */
// // //   async sendLeadConsumedNotification(
// // //     leadOwnerId: string,
// // //     leadTitle: string,
// // //     consumerCompanyName: string,
// // //   ): Promise<void> {
// // //     try {
// // //       this.logger.log(`[LeadConsumed] Notifying owner: ${leadOwnerId}`);

// // //       // Create DB Entry
// // //       await this.createNotification(
// // //         leadOwnerId,
// // //         NotificationType.LEAD_CONSUMED,
// // //         '🤝 Lead Consumed',
// // //         `${consumerCompanyName} viewed your lead: ${leadTitle}`,
// // //         { screen: 'MyLeads' },
// // //       );
// // //       this.logger.log('[LeadConsumed] ✅ Database notification created');

// // //       // Send Push to mobile devices
// // //       const tokens = await this.getCompanyTokens(leadOwnerId);
// // //       if (tokens.length > 0) {
// // //         await this.sendPushNotifications(
// // //           tokens,
// // //           '🤝 Lead Consumed',
// // //           `${consumerCompanyName} viewed your lead: ${leadTitle}`,
// // //           { type: 'LEAD_CONSUMED', screen: 'MyLeads' },
// // //         );
// // //         this.logger.log(`[LeadConsumed] ✅ Push sent to ${tokens.length} devices`);
// // //       } else {
// // //         this.logger.log('[LeadConsumed] No mobile devices to notify');
// // //       }
// // //     } catch (error) {
// // //       this.logger.error('[LeadConsumed] Error:', error);
// // //     }
// // //   }

// // //   // ==========================================
// // //   // STANDARD NOTIFICATION CRUD METHODS
// // //   // ==========================================

// // //   async getUserNotifications(companyId: string): Promise<Notification[]> {
// // //     const notifications = await this.notificationRepository.find({
// // //       where: { companyId },
// // //       order: { createdAt: 'DESC' },
// // //     });
    
// // //     this.logger.log(`Retrieved ${notifications.length} notifications for company ${companyId}`);
// // //     return notifications;
// // //   }

// // //   async getUnreadCount(companyId: string): Promise<number> {
// // //     const count = await this.notificationRepository.count({
// // //       where: { companyId, isRead: false },
// // //     });
    
// // //     this.logger.log(`Company ${companyId} has ${count} unread notifications`);
// // //     return count;
// // //   }

// // //   async markAsRead(notificationIds: string[]): Promise<void> {
// // //     if (notificationIds.length === 0) return;
    
// // //     await this.notificationRepository.update(
// // //       { id: In(notificationIds) },
// // //       { isRead: true },
// // //     );
    
// // //     this.logger.log(`Marked ${notificationIds.length} notifications as read`);
// // //   }

// // //   async markAllAsRead(companyId: string): Promise<void> {
// // //     const result = await this.notificationRepository.update(
// // //       { companyId, isRead: false },
// // //       { isRead: true },
// // //     );
    
// // //     this.logger.log(`Marked all notifications as read for company ${companyId} (${result.affected} affected)`);
// // //   }

// // //   async deleteNotification(notificationId: string, companyId: string): Promise<void> {
// // //     await this.notificationRepository.delete({ id: notificationId, companyId });
// // //     this.logger.log(`Deleted notification ${notificationId} for company ${companyId}`);
// // //   }

// // //   async deleteAllNotifications(companyId: string): Promise<void> {
// // //     const result = await this.notificationRepository.delete({ companyId });
// // //     this.logger.log(`Deleted all notifications for company ${companyId} (${result.affected} deleted)`);
// // //   }
// // // }

// // // src/modules/notifications/notifications.service.ts - FIXED FOR ALL PLATFORMS
// // import { Injectable, Logger } from '@nestjs/common';
// // import { InjectRepository } from '@nestjs/typeorm';
// // import { Repository, Not, In } from 'typeorm';
// // import { Notification, NotificationType } from './entities/notification.entity';
// // import { ExpoPushToken } from './entities/expo-push-token.entity';
// // import { Company } from '../company/entities/company.entity';
// // import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

// // @Injectable()
// // export class NotificationsService {
// //   private readonly logger = new Logger(NotificationsService.name);
// //   private expo: Expo;

// //   constructor(
// //     @InjectRepository(Notification)
// //     private notificationRepository: Repository<Notification>,
// //     @InjectRepository(ExpoPushToken)
// //     private expoPushTokenRepository: Repository<ExpoPushToken>,
// //     @InjectRepository(Company)
// //     private companyRepository: Repository<Company>,
// //   ) {
// //     this.expo = new Expo();
// //     this.logger.log('NotificationsService initialized');
// //   }

// //   /**
// //    * Register a user's Expo push token
// //    * ✅ NOW ACCEPTS ALL TOKENS (web, mobile, placeholder) for database tracking
// //    * Only validates for actual push notifications
// //    */
// //   async registerPushToken(
// //     companyId: string,
// //     token: string,
// //     deviceId?: string,
// //     platform?: string,
// //   ): Promise<ExpoPushToken | null> {
// //     try {
// //       this.logger.log(`Registering token for company ${companyId}, platform: ${platform || 'unknown'}`);

// //       // ✅ ALWAYS accept the token for database storage
// //       // We'll filter by platform when sending actual push notifications
      
// //       const existingToken = await this.expoPushTokenRepository.findOne({
// //         where: { token },
// //       });

// //       if (existingToken) {
// //         this.logger.log(`Updating existing token for company ${companyId}`);
// //         existingToken.companyId = companyId;
// //         existingToken.deviceId = deviceId;
// //         existingToken.platform = platform || 'unknown';
// //         existingToken.isActive = true;
// //         return await this.expoPushTokenRepository.save(existingToken);
// //       }

// //       this.logger.log(`Creating new token for company ${companyId}`);
// //       const newToken = this.expoPushTokenRepository.create({
// //         companyId,
// //         token,
// //         deviceId,
// //         platform: platform || 'unknown',
// //         isActive: true,
// //       });

// //       const saved = await this.expoPushTokenRepository.save(newToken);
// //       this.logger.log(`✅ Token registered successfully for company ${companyId}`);
// //       return saved;
// //     } catch (error) {
// //       this.logger.error(`❌ Error registering token for company ${companyId}:`, error);
// //       // ✅ Return null instead of throwing - don't crash the app
// //       return null;
// //     }
// //   }

// //   async unregisterPushToken(token: string): Promise<void> {
// //     try {
// //       this.logger.log(`Unregistering token: ${token}`);
// //       await this.expoPushTokenRepository.update({ token }, { isActive: false });
// //     } catch (error) {
// //       this.logger.error('Error unregistering token:', error);
// //       // Don't throw
// //     }
// //   }

// //   /**
// //    * Get company tokens for PUSH notifications (mobile only - excludes web/invalid)
// //    */
// //   async getCompanyPushTokens(companyId: string): Promise<string[]> {
// //     try {
// //       const tokens = await this.expoPushTokenRepository.find({
// //         where: { 
// //           companyId, 
// //           isActive: true,
// //         },
// //       });
      
// //       // ✅ Filter to only valid mobile push tokens
// //       const validPushTokens = tokens
// //         .filter(t => 
// //           t.platform !== 'web' && 
// //           t.platform !== 'unknown' &&
// //           Expo.isExpoPushToken(t.token)
// //         )
// //         .map(t => t.token);
      
// //       this.logger.log(`Found ${validPushTokens.length} valid PUSH tokens for company ${companyId}`);
// //       return validPushTokens;
// //     } catch (error) {
// //       this.logger.error(`Error getting push tokens for company ${companyId}:`, error);
// //       return [];
// //     }
// //   }

// //   /**
// //    * Send push notification to mobile devices (Android + iOS Compatible)
// //    * ✅ Safely handles errors - never crashes
// //    */
// //   async sendPushNotifications(
// //     tokens: string[],
// //     title: string,
// //     body: string,
// //     data?: any,
// //   ): Promise<void> {
// //     try {
// //       const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

// //       if (validTokens.length === 0) {
// //         this.logger.log('No valid tokens to send push notifications');
// //         return;
// //       }

// //       this.logger.log(`Sending push notification to ${validTokens.length} devices: "${title}"`);

// //       const messages: ExpoPushMessage[] = validTokens.map(token => ({
// //         to: token,
// //         sound: 'default',
// //         title,
// //         body,
// //         data: data || {},
// //         priority: 'high',
// //         channelId: 'default',
// //         badge: 1,
// //         _displayInForeground: true,
// //       }));

// //       const chunks = this.expo.chunkPushNotifications(messages);
// //       const tickets: ExpoPushTicket[] = [];

// //       for (const chunk of chunks) {
// //         try {
// //           const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
// //           tickets.push(...ticketChunk);
// //         } catch (error) {
// //           this.logger.error('Error sending push notification chunk:', error);
// //           // Continue with other chunks
// //         }
// //       }

// //       // Handle invalid tokens
// //       for (let i = 0; i < tickets.length; i++) {
// //         const ticket = tickets[i];
// //         if (ticket.status === 'error') {
// //           this.logger.warn(`Push error for token ${i}:`, ticket.details);
// //           if (ticket.details?.error === 'DeviceNotRegistered') {
// //             await this.unregisterPushToken(validTokens[i]);
// //           }
// //         }
// //       }

// //       this.logger.log(`✅ Push notifications sent successfully`);
// //     } catch (error) {
// //       this.logger.error('❌ Error in sendPushNotifications:', error);
// //       // Don't throw - notifications are not critical
// //     }
// //   }

// //   /**
// //    * Create a notification record in database
// //    * ✅ ALWAYS works regardless of push notification status
// //    */
// //   async createNotification(
// //     companyId: string,
// //     type: NotificationType,
// //     title: string,
// //     body: string,
// //     data?: any,
// //     leadId?: string,
// //   ): Promise<Notification> {
// //     try {
// //       const notification = this.notificationRepository.create({
// //         companyId,
// //         type,
// //         title,
// //         body,
// //         data: data || {},
// //         leadId,
// //       });

// //       const saved = await this.notificationRepository.save(notification);
// //       this.logger.log(`✅ Created notification ${saved.id} for company ${companyId}`);
// //       return saved;
// //     } catch (error) {
// //       this.logger.error(`❌ Error creating notification for company ${companyId}:`, error);
// //       throw error; // This one should throw since it's a database operation
// //     }
// //   }

// //   /**
// //    * BROADCAST: Send notification to ALL companies
// //    * ✅ Creates database records for EVERYONE (web + mobile)
// //    * ✅ Sends push ONLY to valid mobile tokens
// //    */
// //   async sendBroadcastNotification(
// //     title: string,
// //     body: string,
// //     data?: any,
// //   ): Promise<void> {
// //     try {
// //       this.logger.log('=== STARTING BROADCAST NOTIFICATION ===');
// //       this.logger.log(`Title: "${title}"`);
// //       this.logger.log(`Body: "${body}"`);

// //       // Step 1: Get ALL companies
// //       const allCompanies = await this.companyRepository.find({ 
// //         where: { isDeleted: false },
// //         select: ['id', 'companyName'],
// //       });
      
// //       this.logger.log(`✅ Step 1: Found ${allCompanies.length} active companies`);
      
// //       if (allCompanies.length === 0) {
// //         this.logger.warn('❌ No companies found');
// //         return;
// //       }

// //       // Step 2: Create database notification for EVERY company (web + mobile)
// //       this.logger.log(`📝 Step 2: Creating ${allCompanies.length} database notifications...`);
      
// //       const dbPromises = allCompanies.map(company => 
// //         this.createNotification(
// //           company.id,
// //           NotificationType.ADMIN_BROADCAST,
// //           title,
// //           body,
// //           data || {},
// //         ).catch(err => {
// //           this.logger.error(`Error creating notification for ${company.id}:`, err);
// //           return null; // Don't fail entire broadcast
// //         })
// //       );
      
// //       const createdNotifications = (await Promise.all(dbPromises)).filter(n => n !== null);
// //       this.logger.log(`✅ Step 2: Created ${createdNotifications.length} database notifications`);

// //       // Step 3: Send push ONLY to valid mobile tokens
// //       this.logger.log('📱 Step 3: Sending push to mobile devices...');
      
// //       const activeTokens = await this.expoPushTokenRepository.find({ 
// //         where: { isActive: true } 
// //       });
      
// //       this.logger.log(`Found ${activeTokens.length} total active tokens`);
      
// //       const mobileTokens = activeTokens
// //         .filter(t => 
// //           t.platform !== 'web' && 
// //           t.platform !== 'unknown' &&
// //           Expo.isExpoPushToken(t.token)
// //         )
// //         .map(t => t.token);
      
// //       this.logger.log(`Filtered to ${mobileTokens.length} valid mobile push tokens`);
      
// //       if (mobileTokens.length > 0) {
// //         await this.sendPushNotifications(
// //           mobileTokens,
// //           title,
// //           body,
// //           { ...data, type: 'ADMIN_BROADCAST' },
// //         );
// //       } else {
// //         this.logger.log('⚠️ No mobile devices for push');
// //       }

// //       this.logger.log('=== BROADCAST COMPLETED ===');
// //       this.logger.log(`Summary: ${createdNotifications.length} DB records, ${mobileTokens.length} push sent`);
// //     } catch (error) {
// //       this.logger.error('❌ BROADCAST ERROR:', error);
// //       // Don't throw - partial success is OK
// //     }
// //   }

// //   /**
// //    * Send notification when a new lead is posted
// //    * ✅ Database records for ALL users (web + mobile)
// //    * ✅ Push only to mobile devices
// //    */
// //   async sendNewLeadNotification(
// //     leadId: string,
// //     leadTitle: string,
// //     creatorCompanyId: string,
// //   ): Promise<void> {
// //     try {
// //       this.logger.log(`[NewLead] Sending notification for lead: ${leadId}`);

// //       const allCompanies = await this.companyRepository.find({
// //         where: { 
// //           id: Not(creatorCompanyId),
// //           isDeleted: false,
// //         },
// //         select: ['id'],
// //       });

// //       if (allCompanies.length === 0) {
// //         this.logger.log('[NewLead] No companies to notify');
// //         return;
// //       }

// //       this.logger.log(`[NewLead] Creating notifications for ${allCompanies.length} companies`);

// //       // Create DB notifications for ALL
// //       const dbPromises = allCompanies.map(company =>
// //         this.createNotification(
// //           company.id,
// //           NotificationType.NEW_LEAD,
// //           '📣 New Lead Available',
// //           leadTitle,
// //           { leadId, screen: 'LeadDetails' },
// //           leadId,
// //         ).catch(err => {
// //           this.logger.error(`Error creating notification for ${company.id}:`, err);
// //           return null;
// //         })
// //       );

// //       const created = (await Promise.all(dbPromises)).filter(n => n !== null);
// //       this.logger.log(`[NewLead] ✅ Created ${created.length} database notifications`);

// //       // Send push to mobile only
// //       const tokens = await this.expoPushTokenRepository.find({
// //         where: { 
// //           companyId: Not(creatorCompanyId), 
// //           isActive: true,
// //         },
// //       });

// //       const mobileTokens = tokens
// //         .filter(t => 
// //           t.platform !== 'web' && 
// //           t.platform !== 'unknown' &&
// //           Expo.isExpoPushToken(t.token)
// //         )
// //         .map(t => t.token);

// //       if (mobileTokens.length > 0) {
// //         await this.sendPushNotifications(
// //           mobileTokens,
// //           '📣 New Lead Available',
// //           leadTitle,
// //           { type: 'NEW_LEAD', leadId, screen: 'LeadDetails' },
// //         );
// //         this.logger.log(`[NewLead] ✅ Push sent to ${mobileTokens.length} mobile devices`);
// //       }
// //     } catch (error) {
// //       this.logger.error('[NewLead] Error:', error);
// //       // Don't throw - notifications are not critical
// //     }
// //   }

// //   /**
// //    * Notify lead owner when their lead is consumed
// //    */
// //   async sendLeadConsumedNotification(
// //     leadOwnerId: string,
// //     leadTitle: string,
// //     consumerCompanyName: string,
// //   ): Promise<void> {
// //     try {
// //       this.logger.log(`[LeadConsumed] Notifying owner: ${leadOwnerId}`);

// //       // Create DB notification
// //       await this.createNotification(
// //         leadOwnerId,
// //         NotificationType.LEAD_CONSUMED,
// //         '🤝 Lead Consumed',
// //         `${consumerCompanyName} viewed your lead: ${leadTitle}`,
// //         { screen: 'MyLeads' },
// //       );

// //       // Send push to mobile
// //       const tokens = await this.getCompanyPushTokens(leadOwnerId);
// //       if (tokens.length > 0) {
// //         await this.sendPushNotifications(
// //           tokens,
// //           '🤝 Lead Consumed',
// //           `${consumerCompanyName} viewed your lead: ${leadTitle}`,
// //           { type: 'LEAD_CONSUMED', screen: 'MyLeads' },
// //         );
// //       }
// //     } catch (error) {
// //       this.logger.error('[LeadConsumed] Error:', error);
// //     }
// //   }

// //   // ==========================================
// //   // CRUD METHODS - ALL WITH ERROR HANDLING
// //   // ==========================================

// //   async getUserNotifications(companyId: string): Promise<Notification[]> {
// //     try {
// //       const notifications = await this.notificationRepository.find({
// //         where: { companyId },
// //         order: { createdAt: 'DESC' },
// //       });
      
// //       this.logger.log(`Retrieved ${notifications.length} notifications for company ${companyId}`);
// //       return notifications;
// //     } catch (error) {
// //       this.logger.error(`Error getting notifications for company ${companyId}:`, error);
// //       return []; // Return empty array instead of crashing
// //     }
// //   }

// //   async getUnreadCount(companyId: string): Promise<number> {
// //     try {
// //       const count = await this.notificationRepository.count({
// //         where: { companyId, isRead: false },
// //       });
      
// //       this.logger.log(`Company ${companyId} has ${count} unread notifications`);
// //       return count;
// //     } catch (error) {
// //       this.logger.error(`Error getting unread count for company ${companyId}:`, error);
// //       return 0;
// //     }
// //   }

// //   async markAsRead(notificationIds: string[]): Promise<void> {
// //     try {
// //       if (notificationIds.length === 0) return;
      
// //       await this.notificationRepository.update(
// //         { id: In(notificationIds) },
// //         { isRead: true },
// //       );
      
// //       this.logger.log(`Marked ${notificationIds.length} notifications as read`);
// //     } catch (error) {
// //       this.logger.error('Error marking notifications as read:', error);
// //       // Don't throw
// //     }
// //   }

// //   async markAllAsRead(companyId: string): Promise<void> {
// //     try {
// //       const result = await this.notificationRepository.update(
// //         { companyId, isRead: false },
// //         { isRead: true },
// //       );
      
// //       this.logger.log(`Marked all notifications as read for company ${companyId} (${result.affected} affected)`);
// //     } catch (error) {
// //       this.logger.error(`Error marking all as read for company ${companyId}:`, error);
// //     }
// //   }

// //   async deleteNotification(notificationId: string, companyId: string): Promise<void> {
// //     try {
// //       await this.notificationRepository.delete({ id: notificationId, companyId });
// //       this.logger.log(`Deleted notification ${notificationId}`);
// //     } catch (error) {
// //       this.logger.error(`Error deleting notification ${notificationId}:`, error);
// //     }
// //   }

// //   async deleteAllNotifications(companyId: string): Promise<void> {
// //     try {
// //       const result = await this.notificationRepository.delete({ companyId });
// //       this.logger.log(`Deleted all notifications for company ${companyId} (${result.affected} deleted)`);
// //     } catch (error) {
// //       this.logger.error(`Error deleting all notifications for company ${companyId}:`, error);
// //     }
// //   }
// // }





// // services/notificationService.ts - FIXED FOR ANDROID PUSH NOTIFICATIONS
// import * as Device from 'expo-device';
// import { Platform } from 'react-native';
// import Constants from 'expo-constants';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { apiCall } from './apiClient';

// export interface NotificationData {
//   id: string;
//   type: string;
//   title: string;
//   body: string;
//   data: any;
//   isRead: boolean;
//   createdAt: string;
//   leadId?: string;
// }

// class NotificationService {
//   private notificationsModule: any = null;
//   private isAndroid = Platform.OS === 'android';
//   private isInitialized = false;

//   /**
//    * Initialize notification system - MUST BE CALLED FIRST
//    */
//   async initialize(): Promise<boolean> {
//     if (this.isInitialized) return true;

//     try {
//       if (!this.isAndroid) {
//         console.log('[NotificationService] Not Android, skipping');
//         return false;
//       }

//       if (Constants.appOwnership === 'expo') {
//         console.log('[NotificationService] Expo Go detected, skipping');
//         return false;
//       }

//       if (!Device.isDevice) {
//         console.log('[NotificationService] Emulator detected, skipping');
//         return false;
//       }

//       // Load module
//       const loaded = await this.loadNotificationsModule();
//       if (!loaded) return false;

//       // ✅ CRITICAL: Set notification handler FIRST
//       await this.setupNotificationHandler();

//       // ✅ CRITICAL: Create Android channel BEFORE getting token
//       await this.setupAndroidChannel();

//       this.isInitialized = true;
//       console.log('[NotificationService] ✅ Initialized successfully');
//       return true;
//     } catch (error) {
//       console.error('[NotificationService] Initialization failed:', error);
//       return false;
//     }
//   }

//   /**
//    * Load expo-notifications module safely
//    */
//   private async loadNotificationsModule(): Promise<boolean> {
//     try {
//       if (this.notificationsModule) return true;
      
//       const Notifications = await import('expo-notifications');
//       this.notificationsModule = Notifications;
      
//       console.log('[NotificationService] ✅ Module loaded');
//       return true;
//     } catch (error) {
//       console.error('[NotificationService] Failed to load module:', error);
//       return false;
//     }
//   }

//   /**
//    * ✅ FIX: Set notification handler BEFORE anything else
//    */
//   private async setupNotificationHandler(): Promise<void> {
//     if (!this.notificationsModule) return;

//     try {
//       const Notifications = this.notificationsModule;
      
//       Notifications.setNotificationHandler({
//         handleNotification: async () => ({
//           shouldShowAlert: true,
//           shouldPlaySound: true,
//           shouldSetBadge: true,
//           shouldShowBanner: true, // Android specific
//           shouldShowList: true,   // Android specific
//         }),
//       });

//       console.log('[NotificationService] ✅ Notification handler configured');
//     } catch (error) {
//       console.error('[NotificationService] Failed to set handler:', error);
//     }
//   }

//   /**
//    * ✅ FIX: Create Android notification channel BEFORE registering for push
//    */
//   private async setupAndroidChannel(): Promise<void> {
//     if (!this.isAndroid || !this.notificationsModule) return;

//     try {
//       const Notifications = this.notificationsModule;
      
//       // Create the default channel
//       await Notifications.setNotificationChannelAsync('default', {
//         name: 'Default Notifications',
//         importance: Notifications.AndroidImportance.MAX,
//         vibrationPattern: [0, 250, 250, 250],
//         lightColor: '#01BE8B',
//         sound: 'default',
//         enableVibrate: true,
//         showBadge: true,
//         enableLights: true,
//         lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
//       });

//       console.log('[NotificationService] ✅ Android channel created');
//     } catch (error) {
//       console.error('[NotificationService] Failed to create Android channel:', error);
//       throw error; // This is critical, so throw
//     }
//   }

//   /**
//    * ✅ FIX: Validate project ID before attempting to get token
//    */
//   private validateProjectId(): string | null {
//     const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
//     if (!projectId) {
//       console.error('[NotificationService] ❌ CRITICAL: No project ID found!');
//       console.error('[NotificationService] Add this to app.json:');
//       console.error('"extra": { "eas": { "projectId": "926c2cb4-a532-4ac8-ac3b-d5e3b893978d" } }');
//       return null;
//     }

//     console.log('[NotificationService] ✅ Project ID found:', projectId);
//     return projectId;
//   }

//   /**
//    * Register for push notifications - FIXED VERSION
//    */
//   async registerForPushNotifications(): Promise<string | null> {
//     try {
//       // Ensure initialized
//       if (!this.isInitialized) {
//         const initialized = await this.initialize();
//         if (!initialized) return null;
//       }

//       if (!this.notificationsModule) {
//         console.log('[NotificationService] Module not available');
//         return null;
//       }

//       const Notifications = this.notificationsModule;

//       // ✅ Step 1: Check and request permissions
//       console.log('[NotificationService] Step 1: Checking permissions...');
//       const { status: existingStatus } = await Notifications.getPermissionsAsync();
//       let finalStatus = existingStatus;

//       if (existingStatus !== 'granted') {
//         console.log('[NotificationService] Requesting permissions...');
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//       }

//       if (finalStatus !== 'granted') {
//         console.log('[NotificationService] ❌ Permission denied:', finalStatus);
//         return null;
//       }

//       console.log('[NotificationService] ✅ Permission granted');

//       // ✅ Step 2: Validate project ID
//       const projectId = this.validateProjectId();
//       if (!projectId) return null;

//       // ✅ Step 3: Get push token
//       console.log('[NotificationService] Step 3: Getting push token...');
//       let token = null;
      
//       try {
//         const tokenData = await Notifications.getExpoPushTokenAsync({ 
//           projectId,
//         });
//         token = tokenData.data;
//         console.log('[NotificationService] ✅ Token obtained:', token.substring(0, 30) + '...');
//       } catch (tokenError: any) {
//         console.error('[NotificationService] ❌ Token error:', tokenError.message);
        
//         // Provide specific error messages
//         if (tokenError.message?.includes('project ID')) {
//           console.error('[NotificationService] Invalid project ID in app.json');
//         } else if (tokenError.message?.includes('FCM')) {
//           console.error('[NotificationService] FCM/APNs configuration issue');
//         }
        
//         return null;
//       }

//       // ✅ Step 4: Store token locally
//       try {
//         await AsyncStorage.setItem('notification_token', token);
//         await AsyncStorage.setItem('notification_token_timestamp', Date.now().toString());
//       } catch (storageError) {
//         console.log('[NotificationService] Storage save failed (non-critical)');
//       }

//       return token;
//     } catch (error: any) {
//       console.error('[NotificationService] ❌ Registration failed:', error.message);
//       return null;
//     }
//   }

//   /**
//    * ✅ FIX: Register token with backend (with retry logic)
//    */
//   async registerTokenWithBackend(token: string, retries = 3): Promise<boolean> {
//     if (!token) return false;

//     for (let attempt = 1; attempt <= retries; attempt++) {
//       try {
//         const deviceId = await this.getDeviceId();
        
//         console.log(`[NotificationService] Registering with backend (attempt ${attempt}/${retries})...`);

//         await apiCall(
//           '/notifications/register-token',
//           'POST',
//           {
//             token,
//             deviceId,
//             platform: 'android',
//           },
//           true
//         );

//         console.log('[NotificationService] ✅ Backend registration successful');
        
//         // Store success timestamp
//         await AsyncStorage.setItem('backend_registration_timestamp', Date.now().toString());
        
//         return true;
//       } catch (error: any) {
//         console.error(`[NotificationService] Backend registration attempt ${attempt} failed:`, error.message);
        
//         // Don't retry on auth errors
//         if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
//           console.log('[NotificationService] Auth error - stopping retries');
//           return false;
//         }
        
//         // Wait before retry (exponential backoff)
//         if (attempt < retries) {
//           const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
//           console.log(`[NotificationService] Retrying in ${delay}ms...`);
//           await new Promise(resolve => setTimeout(resolve, delay));
//         }
//       }
//     }

//     console.log('[NotificationService] ❌ All backend registration attempts failed');
//     return false;
//   }

//   /**
//    * Unregister token
//    */
//   async unregisterToken(): Promise<boolean> {
//     try {
//       const token = await AsyncStorage.getItem('notification_token');
//       if (!token) return true;

//       try {
//         await apiCall(
//           '/notifications/unregister-token',
//           'POST',
//           { token },
//           true
//         );
//       } catch (backendError) {
//         console.log('[NotificationService] Backend unregister failed (non-critical)');
//       }

//       await AsyncStorage.multiRemove([
//         'notification_token',
//         'notification_token_timestamp',
//         'backend_registration_timestamp'
//       ]);
      
//       console.log('[NotificationService] ✅ Token unregistered');
//       return true;
//     } catch (error: any) {
//       console.error('[NotificationService] Unregister error:', error.message);
//       return false;
//     }
//   }

//   /**
//    * Check if token needs refresh (older than 30 days)
//    */
//   async shouldRefreshToken(): Promise<boolean> {
//     try {
//       const timestamp = await AsyncStorage.getItem('notification_token_timestamp');
//       if (!timestamp) return true;

//       const age = Date.now() - parseInt(timestamp);
//       const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
//       return age > thirtyDays;
//     } catch {
//       return true;
//     }
//   }

//   // ========== DATABASE METHODS (Always work) ==========

//   async getAllNotifications(): Promise<NotificationData[]> {
//     try {
//       const response = await apiCall<{ message: string; data: NotificationData[] }>(
//         '/notifications',
//         'GET',
//         null,
//         true
//       );

//       if (response && Array.isArray(response.data)) {
//         console.log(`[NotificationService] ✅ Loaded ${response.data.length} notifications`);
//         return response.data;
//       }

//       return [];
//     } catch (error: any) {
//       console.error('[NotificationService] Get error:', error.message);
//       return [];
//     }
//   }

//   async getUnreadCount(): Promise<number> {
//     try {
//       const response = await apiCall<{ data: { count: number } }>(
//         '/notifications/unread-count',
//         'GET',
//         null,
//         true
//       );

//       return response?.data?.count || 0;
//     } catch (error: any) {
//       console.error('[NotificationService] Count error:', error.message);
//       return 0;
//     }
//   }

//   async markAsRead(notificationIds: string[]): Promise<boolean> {
//     if (!notificationIds?.length) return false;

//     try {
//       await apiCall(
//         '/notifications/mark-read',
//         'POST',
//         { notificationIds },
//         true
//       );
//       return true;
//     } catch (error: any) {
//       console.error('[NotificationService] Mark read error:', error.message);
//       return false;
//     }
//   }

//   async markAllAsRead(): Promise<boolean> {
//     try {
//       await apiCall(
//         '/notifications/mark-all-read',
//         'POST',
//         {},
//         true
//       );
//       return true;
//     } catch (error: any) {
//       console.error('[NotificationService] Mark all error:', error.message);
//       return false;
//     }
//   }

//   async deleteNotification(notificationId: string): Promise<boolean> {
//     if (!notificationId) return false;

//     try {
//       await apiCall(
//         `/notifications/${notificationId}`,
//         'DELETE',
//         null,
//         true
//       );
//       return true;
//     } catch (error: any) {
//       console.error('[NotificationService] Delete error:', error.message);
//       return false;
//     }
//   }

//   async deleteAllNotifications(): Promise<boolean> {
//     try {
//       await apiCall(
//         '/notifications',
//         'DELETE',
//         null,
//         true
//       );
//       return true;
//     } catch (error: any) {
//       console.error('[NotificationService] Delete all error:', error.message);
//       return false;
//     }
//   }

//   async clearAllDeliveredNotifications(): Promise<boolean> {
//     try {
//       if (!this.isAndroid || !this.notificationsModule) return false;

//       await this.notificationsModule.dismissAllNotificationsAsync();
//       console.log('[NotificationService] ✅ Cleared delivered');
//       return true;
//     } catch (error: any) {
//       console.log('[NotificationService] Clear error:', error.message);
//       return false;
//     }
//   }

//   private async getDeviceId(): Promise<string> {
//     try {
//       let deviceId = await AsyncStorage.getItem('device_id');
      
//       if (!deviceId) {
//         deviceId = `android-${Date.now()}-${Math.random().toString(36).substring(7)}`;
//         await AsyncStorage.setItem('device_id', deviceId);
//       }
      
//       return deviceId;
//     } catch (error) {
//       return `android-${Date.now()}`;
//     }
//   }

//   async areNotificationsEnabled(): Promise<boolean> {
//     try {
//       if (!this.isAndroid || !this.notificationsModule) return false;
      
//       const { status } = await this.notificationsModule.getPermissionsAsync();
//       return status === 'granted';
//     } catch (error) {
//       return false;
//     }
//   }

//   /**
//    * ✅ Get diagnostic info for debugging
//    */
//   async getDiagnostics(): Promise<any> {
//     const diagnostics: any = {
//       platform: Platform.OS,
//       isDevice: Device.isDevice,
//       isExpoGo: Constants.appOwnership === 'expo',
//       projectId: Constants.expoConfig?.extra?.eas?.projectId || null,
//       moduleLoaded: !!this.notificationsModule,
//       isInitialized: this.isInitialized,
//     };

//     try {
//       diagnostics.storedToken = !!(await AsyncStorage.getItem('notification_token'));
//       diagnostics.tokenAge = await AsyncStorage.getItem('notification_token_timestamp');
//       diagnostics.backendRegistered = !!(await AsyncStorage.getItem('backend_registration_timestamp'));
      
//       if (this.notificationsModule) {
//         const { status } = await this.notificationsModule.getPermissionsAsync();
//         diagnostics.permissionStatus = status;
//       }
//     } catch (error) {
//       diagnostics.error = error.message;
//     }

//     return diagnostics;
//   }
// }

// export const notificationService = new NotificationService();



import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';
import { Company } from '../company/entities/company.entity';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

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
  }

  /**
   * Register or update a push token
   */
  async registerPushToken(
    companyId: string,
    token: string,
    deviceId?: string,
    platform?: string,
  ): Promise<ExpoPushToken | null> {
    try {
      const existingToken = await this.expoPushTokenRepository.findOne({ where: { token } });

      if (existingToken) {
        existingToken.companyId = companyId;
        existingToken.deviceId = deviceId;
        existingToken.platform = platform || 'unknown';
        existingToken.isActive = true;
        return await this.expoPushTokenRepository.save(existingToken);
      }

      const newToken = this.expoPushTokenRepository.create({
        companyId,
        token,
        deviceId,
        platform: platform || 'unknown',
        isActive: true,
      });

      return await this.expoPushTokenRepository.save(newToken);
    } catch (error) {
      this.logger.error(`Error registering token: ${error.message}`);
      return null;
    }
  }

  async unregisterPushToken(token: string): Promise<void> {
    await this.expoPushTokenRepository.update({ token }, { isActive: false });
  }

  /**
   * Internal helper for Expo Push
   */
  async sendPushNotifications(tokens: string[], title: string, body: string, data?: any): Promise<void> {
    const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));
    if (validTokens.length === 0) return;

    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        this.logger.error('Error sending push chunk', error);
      }
    }
  }

  /**
   * Create database notification record
   */
  async createNotification(
    companyId: string, 
    type: NotificationType, 
    title: string, 
    body: string, 
    data?: any, 
    leadId?: string
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({ 
      companyId, 
      type, 
      title, 
      body, 
      data: data || {}, 
      leadId 
    });
    return await this.notificationRepository.save(notification);
  }

  // --- BUSINESS LOGIC METHODS ---

  async sendNewLeadNotification(companyId: string, leadId: string, leadName: string): Promise<void> {
    const title = 'New Lead Assigned! 🚀';
    const body = `A new lead "${leadName}" has been assigned to you.`;
    
    await this.createNotification(companyId, NotificationType.NEW_LEAD, title, body, { leadId }, leadId);

    const tokens = await this.expoPushTokenRepository.find({ where: { companyId, isActive: true } });
    const pushTokens = tokens.map(t => t.token);
    await this.sendPushNotifications(pushTokens, title, body, { leadId, type: 'NEW_LEAD' });
  }

  async sendLeadConsumedNotification(companyId: string, leadId: string, leadName: string): Promise<void> {
    const title = 'Lead Status Updated';
    const body = `The lead "${leadName}" has been successfully processed.`;

    // Note: If NotificationType.LEAD_UPDATE fails, check your entity for the correct enum name
    await this.createNotification(companyId, NotificationType.NEW_LEAD, title, body, { leadId }, leadId);

    const tokens = await this.expoPushTokenRepository.find({ where: { companyId, isActive: true } });
    const pushTokens = tokens.map(t => t.token);
    await this.sendPushNotifications(pushTokens, title, body, { leadId, type: 'LEAD_UPDATE' });
  }

  async sendBroadcastNotification(title: string, body: string, data?: any): Promise<void> {
    const companies = await this.companyRepository.find({ where: { isDeleted: false } });
    
    for (const company of companies) {
      await this.createNotification(company.id, NotificationType.ADMIN_BROADCAST, title, body, data);
    }

    const tokens = await this.expoPushTokenRepository.find({ where: { isActive: true } });
    const pushTokens = tokens.map(t => t.token);
    await this.sendPushNotifications(pushTokens, title, body, { ...data, type: 'BROADCAST' });
  }

  // --- DATA MANAGEMENT METHODS ---

  async getUserNotifications(companyId: string) {
    return this.notificationRepository.find({ 
      where: { companyId }, 
      order: { createdAt: 'DESC' } 
    });
  }

  async getUnreadCount(companyId: string) {
    return this.notificationRepository.count({ where: { companyId, isRead: false } });
  }

  async markAsRead(notificationIds: string[]) {
    if (notificationIds.length > 0) {
      await this.notificationRepository.update({ id: In(notificationIds) }, { isRead: true });
    }
  }

  async markAllAsRead(companyId: string): Promise<void> {
    await this.notificationRepository.update({ companyId, isRead: false }, { isRead: true });
  }

  async deleteNotification(id: string, companyId: string): Promise<void> {
    const result = await this.notificationRepository.delete({ id, companyId });
    if (result.affected === 0) {
      throw new NotFoundException(`Notification not found`);
    }
  }

  async deleteAllNotifications(companyId: string): Promise<void> {
    await this.notificationRepository.delete({ companyId });
  }
}