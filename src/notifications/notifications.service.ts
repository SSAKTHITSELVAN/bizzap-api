// src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, IsNull } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { ExpoPushToken } from './entities/expo-push-token.entity';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class NotificationsService {
  private expo: Expo;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(ExpoPushToken)
    private expoPushTokenRepository: Repository<ExpoPushToken>,
  ) {
    this.expo = new Expo();
  }

  /**
   * Register a user's Expo push token
   */
  async registerPushToken(
    companyId: string,
    token: string,
    deviceId?: string,
    platform?: string,
  ): Promise<ExpoPushToken> {
    // Validate token
    if (!Expo.isExpoPushToken(token)) {
      throw new Error(`Push token ${token} is not a valid Expo push token`);
    }

    // Check if token already exists
    const existingToken = await this.expoPushTokenRepository.findOne({
      where: { token },
    });

    if (existingToken) {
      // Update existing token
      existingToken.companyId = companyId;
      existingToken.deviceId = deviceId;
      existingToken.platform = platform;
      existingToken.isActive = true;
      return await this.expoPushTokenRepository.save(existingToken);
    }

    // Create new token
    const newToken = this.expoPushTokenRepository.create({
      companyId,
      token,
      deviceId,
      platform,
      isActive: true,
    });

    return await this.expoPushTokenRepository.save(newToken);
  }

  /**
   * Unregister a push token
   */
  async unregisterPushToken(token: string): Promise<void> {
    await this.expoPushTokenRepository.update({ token }, { isActive: false });
  }

  /**
   * Get all active tokens for a company
   */
  async getCompanyTokens(companyId: string): Promise<string[]> {
    const tokens = await this.expoPushTokenRepository.find({
      where: { companyId, isActive: true },
    });
    return tokens.map(t => t.token);
  }

  /**
   * Send push notification to specific users
   */
  async sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    // Filter valid tokens
    const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      return;
    }

    // Create messages
    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
    }));

    // Send in chunks
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notifications:', error);
      }
    }

    // Handle tickets and remove invalid tokens
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await this.unregisterPushToken(validTokens[i]);
        }
      }
    }
  }

  /**
   * Create notification in database
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

    return await this.notificationRepository.save(notification);
  }

  /**
   * Send notification for new lead (to all users except creator)
   */
  async sendNewLeadNotification(
    leadId: string,
    leadTitle: string,
    creatorCompanyId: string,
  ): Promise<void> {
    try {
      // Get all active tokens except creator
      const tokens = await this.expoPushTokenRepository.find({
        where: { 
          companyId: Not(creatorCompanyId), 
          isActive: true 
        },
      });

      if (tokens.length === 0) {
        console.log('No tokens found for new lead notification');
        return;
      }

      const pushTokens = tokens.map(t => t.token);

      // Send push notifications
      await this.sendPushNotifications(
        pushTokens,
        '🆕 New Lead Available',
        `${leadTitle}`,
        { 
          type: 'NEW_LEAD', 
          leadId,
          screen: 'LeadDetails'
        },
      );

      // Create notifications in database for all users except creator
      const allCompanyIds = tokens.map(t => t.companyId);
      const uniqueCompanyIds = [...new Set(allCompanyIds)];

      const notificationPromises = uniqueCompanyIds.map(companyId =>
        this.createNotification(
          companyId,
          NotificationType.NEW_LEAD,
          '🆕 New Lead Available',
          leadTitle,
          { leadId, screen: 'LeadDetails' },
          leadId,
        ),
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error sending new lead notification:', error);
      throw error;
    }
  }

  /**
   * Send notification when someone consumes your lead
   */
  async sendLeadConsumedNotification(
    leadOwnerId: string,
    leadTitle: string,
    consumerCompanyName: string,
  ): Promise<void> {
    try {
      const tokens = await this.getCompanyTokens(leadOwnerId);

      if (tokens.length === 0) {
        console.log('No tokens found for lead owner');
        return;
      }

      await this.sendPushNotifications(
        tokens,
        '🎉 Lead Consumed',
        `${consumerCompanyName} viewed your lead: ${leadTitle}`,
        { 
          type: 'LEAD_CONSUMED',
          screen: 'MyLeads'
        },
      );

      await this.createNotification(
        leadOwnerId,
        NotificationType.LEAD_CONSUMED,
        '🎉 Lead Consumed',
        `${consumerCompanyName} viewed your lead: ${leadTitle}`,
        { screen: 'MyLeads' },
      );
    } catch (error) {
      console.error('Error sending lead consumed notification:', error);
      throw error;
    }
  }

  /**
   * Send broadcast notification to all users (Admin only)
   */
  async sendBroadcastNotification(
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    try {
      // Get all active tokens
      const allTokens = await this.expoPushTokenRepository.find({
        where: { isActive: true },
      });

      if (allTokens.length === 0) {
        console.log('No active tokens found for broadcast');
        return;
      }

      const pushTokens = allTokens.map(t => t.token);

      // Send push notifications
      await this.sendPushNotifications(
        pushTokens,
        title,
        body,
        { ...data, type: 'ADMIN_BROADCAST' },
      );

      // Create notifications for all users
      const allCompanyIds = allTokens.map(t => t.companyId);
      const uniqueCompanyIds = [...new Set(allCompanyIds)];

      const notificationPromises = uniqueCompanyIds.map(companyId =>
        this.createNotification(
          companyId,
          NotificationType.ADMIN_BROADCAST,
          title,
          body,
          data || {},
        ),
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user - FIXED VERSION
   */
  async getUserNotifications(companyId: string): Promise<Notification[]> {
    try {
      const notifications = await this.notificationRepository.find({
        where: { companyId },
        order: { createdAt: 'DESC' },
      });

      // Manually load lead data for notifications that have leadId
      const notificationsWithLeads = await Promise.all(
        notifications.map(async (notification) => {
          if (notification.leadId) {
            try {
              const lead = await this.notificationRepository
                .createQueryBuilder('notification')
                .leftJoinAndSelect('notification.lead', 'lead')
                .where('notification.id = :id', { id: notification.id })
                .getOne();
              
              if (lead?.lead) {
                notification.lead = lead.lead;
              }
            } catch (error) {
              console.warn(`Could not load lead ${notification.leadId} for notification ${notification.id}`);
              // Continue without the lead data
            }
          }
          return notification;
        })
      );

      return notificationsWithLeads;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count - FIXED VERSION
   */
  async getUnreadCount(companyId: string): Promise<number> {
    try {
      return await this.notificationRepository.count({
        where: { companyId, isRead: false },
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds: string[]): Promise<void> {
    await this.notificationRepository.update(
      { id: In(notificationIds) },
      { isRead: true },
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(companyId: string): Promise<void> {
    await this.notificationRepository.update(
      { companyId, isRead: false },
      { isRead: true },
    );
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, companyId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, companyId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(companyId: string): Promise<void> {
    await this.notificationRepository.delete({ companyId });
  }
}