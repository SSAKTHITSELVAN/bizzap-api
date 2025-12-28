// src/modules/notifications/notifications.service.ts
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
   * Handles both mobile (valid Expo tokens) and web (placeholder tokens)
   */
  async registerPushToken(
    companyId: string,
    token: string,
    deviceId?: string,
    platform?: string,
  ): Promise<ExpoPushToken | null> {
    this.logger.log(`Registering token for company ${companyId}, platform: ${platform || 'unknown'}`);

    // For web, accept any token format
    const isValidToken = platform === 'web' || Expo.isExpoPushToken(token);
    
    if (!isValidToken) {
      this.logger.warn(`Invalid Expo token: ${token}`);
      return null;
    }

    const existingToken = await this.expoPushTokenRepository.findOne({
      where: { token },
    });

    if (existingToken) {
      this.logger.log(`Updating existing token for company ${companyId}`);
      existingToken.companyId = companyId;
      existingToken.deviceId = deviceId;
      existingToken.platform = platform;
      existingToken.isActive = true;
      return await this.expoPushTokenRepository.save(existingToken);
    }

    this.logger.log(`Creating new token for company ${companyId}`);
    const newToken = this.expoPushTokenRepository.create({
      companyId,
      token,
      deviceId,
      platform,
      isActive: true, // Keep active even for web (for tracking purposes)
    });

    return await this.expoPushTokenRepository.save(newToken);
  }

  async unregisterPushToken(token: string): Promise<void> {
    this.logger.log(`Unregistering token: ${token}`);
    await this.expoPushTokenRepository.update({ token }, { isActive: false });
  }

  /**
   * Get company tokens for push notifications (excludes web)
   */
  async getCompanyTokens(companyId: string): Promise<string[]> {
    const tokens = await this.expoPushTokenRepository.find({
      where: { 
        companyId, 
        isActive: true,
      },
    });
    
    // Filter out web tokens and invalid tokens for push notifications
    const validTokens = tokens
      .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
      .map(t => t.token);
    
    this.logger.log(`Found ${validTokens.length} valid push tokens for company ${companyId}`);
    return validTokens;
  }

  /**
   * Send push notification to specific users (Android + iOS Compatible)
   */
  async sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      this.logger.log('No valid tokens to send push notifications');
      return;
    }

    this.logger.log(`Sending push notification to ${validTokens.length} devices: "${title}"`);

    // Create messages with cross-platform compatibility
    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default', // Required for Android 8.0+
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
        this.logger.error('Error sending push notifications chunk:', error);
      }
    }

    // Handle invalid tokens
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        this.logger.warn(`Push notification error for token ${i}:`, ticket.details);
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await this.unregisterPushToken(validTokens[i]);
        }
      } else {
        this.logger.log(`Push notification sent successfully to token ${i}`);
      }
    }
  }

  /**
   * Create a notification record in database
   */
  async createNotification(
    companyId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
    leadId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      companyId,
      type,
      title,
      body,
      data: data || {},
      leadId,
    });

    const saved = await this.notificationRepository.save(notification);
    this.logger.log(`Created notification ${saved.id} for company ${companyId}`);
    return saved;
  }

  /**
   * BROADCAST: Send notification to ALL companies
   * Creates database records for everyone + sends push to mobile devices
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

      // Step 1: Get ALL non-deleted companies
      const allCompanies = await this.companyRepository.find({ 
        where: { isDeleted: false },
        select: ['id', 'companyName'], // Only select what we need
      });
      
      this.logger.log(`✅ Step 1: Found ${allCompanies.length} active companies`);
      
      if (allCompanies.length === 0) {
        this.logger.warn('❌ No companies found in database');
        return;
      }

      // Step 2: Create database notification for EVERY company
      this.logger.log(`📝 Step 2: Creating ${allCompanies.length} database notifications...`);
      
      const dbPromises = allCompanies.map(company => 
        this.createNotification(
          company.id,
          NotificationType.ADMIN_BROADCAST,
          title,
          body,
          data || {},
        )
      );
      
      const createdNotifications = await Promise.all(dbPromises);
      this.logger.log(`✅ Step 2 Complete: Created ${createdNotifications.length} database notifications`);

      // Step 3: Send push notifications to mobile devices only
      this.logger.log('📱 Step 3: Sending push notifications to mobile devices...');
      
      const activeTokens = await this.expoPushTokenRepository.find({ 
        where: { 
          isActive: true,
        } 
      });
      
      this.logger.log(`Found ${activeTokens.length} total active tokens`);
      
      // Filter to only mobile tokens (exclude web)
      const mobileTokens = activeTokens
        .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
        .map(t => t.token);
      
      this.logger.log(`Filtered to ${mobileTokens.length} valid mobile push tokens`);
      
      if (mobileTokens.length > 0) {
        await this.sendPushNotifications(
          mobileTokens,
          title,
          body,
          { ...data, type: 'ADMIN_BROADCAST' },
        );
        this.logger.log(`✅ Step 3 Complete: Push notifications sent to ${mobileTokens.length} mobile devices`);
      } else {
        this.logger.log('⚠️ Step 3: No mobile devices to send push notifications');
      }

      this.logger.log('=== BROADCAST NOTIFICATION COMPLETED SUCCESSFULLY ===');
      this.logger.log(`Summary: ${createdNotifications.length} DB records, ${mobileTokens.length} push notifications`);
    } catch (error) {
      this.logger.error('❌ BROADCAST ERROR:', error);
      throw error;
    }
  }

  /**
   * Send notification when a new lead is posted
   * Notifies all companies except the creator
   */
  async sendNewLeadNotification(
    leadId: string,
    leadTitle: string,
    creatorCompanyId: string,
  ): Promise<void> {
    try {
      this.logger.log(`[NewLead] Sending notification for lead: ${leadId}`);

      // Get all companies except the creator
      const allCompanies = await this.companyRepository.find({
        where: { 
          id: Not(creatorCompanyId),
          isDeleted: false,
        },
        select: ['id'],
      });

      if (allCompanies.length === 0) {
        this.logger.log('[NewLead] No other companies to notify');
        return;
      }

      this.logger.log(`[NewLead] Creating notifications for ${allCompanies.length} companies`);

      // Create DB notifications for ALL companies
      const dbPromises = allCompanies.map(company =>
        this.createNotification(
          company.id,
          NotificationType.NEW_LEAD,
          '📣 New Lead Available',
          leadTitle,
          { leadId, screen: 'LeadDetails' },
          leadId,
        ),
      );

      await Promise.all(dbPromises);
      this.logger.log(`[NewLead] ✅ Created ${allCompanies.length} database notifications`);

      // Send push notifications to mobile devices
      const tokens = await this.expoPushTokenRepository.find({
        where: { 
          companyId: Not(creatorCompanyId), 
          isActive: true,
        },
      });

      const mobileTokens = tokens
        .filter(t => t.platform !== 'web' && Expo.isExpoPushToken(t.token))
        .map(t => t.token);

      if (mobileTokens.length > 0) {
        await this.sendPushNotifications(
          mobileTokens,
          '📣 New Lead Available',
          leadTitle,
          { type: 'NEW_LEAD', leadId, screen: 'LeadDetails' },
        );
        this.logger.log(`[NewLead] ✅ Sent push to ${mobileTokens.length} mobile devices`);
      } else {
        this.logger.log('[NewLead] No mobile devices to notify');
      }
    } catch (error) {
      this.logger.error('[NewLead] Error:', error);
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

      // Create DB Entry
      await this.createNotification(
        leadOwnerId,
        NotificationType.LEAD_CONSUMED,
        '🤝 Lead Consumed',
        `${consumerCompanyName} viewed your lead: ${leadTitle}`,
        { screen: 'MyLeads' },
      );
      this.logger.log('[LeadConsumed] ✅ Database notification created');

      // Send Push to mobile devices
      const tokens = await this.getCompanyTokens(leadOwnerId);
      if (tokens.length > 0) {
        await this.sendPushNotifications(
          tokens,
          '🤝 Lead Consumed',
          `${consumerCompanyName} viewed your lead: ${leadTitle}`,
          { type: 'LEAD_CONSUMED', screen: 'MyLeads' },
        );
        this.logger.log(`[LeadConsumed] ✅ Push sent to ${tokens.length} devices`);
      } else {
        this.logger.log('[LeadConsumed] No mobile devices to notify');
      }
    } catch (error) {
      this.logger.error('[LeadConsumed] Error:', error);
    }
  }

  // ==========================================
  // STANDARD NOTIFICATION CRUD METHODS
  // ==========================================

  async getUserNotifications(companyId: string): Promise<Notification[]> {
    const notifications = await this.notificationRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
    
    this.logger.log(`Retrieved ${notifications.length} notifications for company ${companyId}`);
    return notifications;
  }

  async getUnreadCount(companyId: string): Promise<number> {
    const count = await this.notificationRepository.count({
      where: { companyId, isRead: false },
    });
    
    this.logger.log(`Company ${companyId} has ${count} unread notifications`);
    return count;
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;
    
    await this.notificationRepository.update(
      { id: In(notificationIds) },
      { isRead: true },
    );
    
    this.logger.log(`Marked ${notificationIds.length} notifications as read`);
  }

  async markAllAsRead(companyId: string): Promise<void> {
    const result = await this.notificationRepository.update(
      { companyId, isRead: false },
      { isRead: true },
    );
    
    this.logger.log(`Marked all notifications as read for company ${companyId} (${result.affected} affected)`);
  }

  async deleteNotification(notificationId: string, companyId: string): Promise<void> {
    await this.notificationRepository.delete({ id: notificationId, companyId });
    this.logger.log(`Deleted notification ${notificationId} for company ${companyId}`);
  }

  async deleteAllNotifications(companyId: string): Promise<void> {
    const result = await this.notificationRepository.delete({ companyId });
    this.logger.log(`Deleted all notifications for company ${companyId} (${result.affected} deleted)`);
  }
}