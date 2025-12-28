// src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
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
    if (!Expo.isExpoPushToken(token)) {
      throw new Error(`Push token ${token} is not a valid Expo push token`);
    }

    const existingToken = await this.expoPushTokenRepository.findOne({
      where: { token },
    });

    if (existingToken) {
      existingToken.companyId = companyId;
      existingToken.deviceId = deviceId;
      existingToken.platform = platform;
      existingToken.isActive = true;
      return await this.expoPushTokenRepository.save(existingToken);
    }

    const newToken = this.expoPushTokenRepository.create({
      companyId,
      token,
      deviceId,
      platform,
      isActive: true,
    });

    return await this.expoPushTokenRepository.save(newToken);
  }

  async unregisterPushToken(token: string): Promise<void> {
    await this.expoPushTokenRepository.update({ token }, { isActive: false });
  }

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
    const validTokens = tokens.filter(token => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) return;

    // Create messages with Android Channel ID
    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default', // REQUIRED for Android 8+ to trigger sound/vibration
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
        console.error('Error sending push notifications chunk:', error);
      }
    }

    // Clean up invalid tokens
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await this.unregisterPushToken(validTokens[i]);
        }
      }
    }
  }

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

  async sendNewLeadNotification(
    leadId: string,
    leadTitle: string,
    creatorCompanyId: string,
  ): Promise<void> {
    try {
      const tokens = await this.expoPushTokenRepository.find({
        where: { 
          companyId: Not(creatorCompanyId), 
          isActive: true 
        },
      });

      if (tokens.length === 0) return;

      const pushTokens = tokens.map(t => t.token);
      const allCompanyIds = [...new Set(tokens.map(t => t.companyId))];

      // 1. Send Pushes
      await this.sendPushNotifications(
        pushTokens,
        '📣 New Lead Available',
        `${leadTitle}`,
        { type: 'NEW_LEAD', leadId, screen: 'LeadDetails' },
      );

      // 2. Create DB Entries
      const notificationPromises = allCompanyIds.map(companyId =>
        this.createNotification(
          companyId,
          NotificationType.NEW_LEAD,
          '📣 New Lead Available',
          leadTitle,
          { leadId, screen: 'LeadDetails' },
          leadId,
        ),
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error sending new lead notification:', error);
    }
  }

  async sendLeadConsumedNotification(
    leadOwnerId: string,
    leadTitle: string,
    consumerCompanyName: string,
  ): Promise<void> {
    try {
      const tokens = await this.getCompanyTokens(leadOwnerId);

      if (tokens.length > 0) {
        await this.sendPushNotifications(
          tokens,
          '🤝 Lead Consumed',
          `${consumerCompanyName} viewed your lead: ${leadTitle}`,
          { type: 'LEAD_CONSUMED', screen: 'MyLeads' },
        );
      }

      await this.createNotification(
        leadOwnerId,
        NotificationType.LEAD_CONSUMED,
        '🤝 Lead Consumed',
        `${consumerCompanyName} viewed your lead: ${leadTitle}`,
        { screen: 'MyLeads' },
      );
    } catch (error) {
      console.error('Error sending lead consumed notification:', error);
    }
  }

  async sendBroadcastNotification(
    title: string,
    body: string,
    data?: any,
  ): Promise<void> {
    try {
      const allTokens = await this.expoPushTokenRepository.find({
        where: { isActive: true },
      });

      if (allTokens.length === 0) return;

      const pushTokens = allTokens.map(t => t.token);
      
      await this.sendPushNotifications(
        pushTokens,
        title,
        body,
        { ...data, type: 'ADMIN_BROADCAST' },
      );

      const uniqueCompanyIds = [...new Set(allTokens.map(t => t.companyId))];

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

  async getUserNotifications(companyId: string): Promise<Notification[]> {
    const notifications = await this.notificationRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });

    const notificationsWithLeads = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.leadId) {
          try {
            const leadNotif = await this.notificationRepository
              .createQueryBuilder('notification')
              .leftJoinAndSelect('notification.lead', 'lead')
              .where('notification.id = :id', { id: notification.id })
              .getOne();
            
            if (leadNotif?.lead) {
              notification.lead = leadNotif.lead;
            }
          } catch (e) {
            // Ignore lead load errors
          }
        }
        return notification;
      })
    );

    return notificationsWithLeads;
  }

  async getUnreadCount(companyId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { companyId, isRead: false },
    });
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    await this.notificationRepository.update(
      { id: In(notificationIds) },
      { isRead: true },
    );
  }

  async markAllAsRead(companyId: string): Promise<void> {
    await this.notificationRepository.update(
      { companyId, isRead: false },
      { isRead: true },
    );
  }

  async deleteNotification(notificationId: string, companyId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, companyId },
    });

    if (!notification) throw new NotFoundException('Notification not found');
    await this.notificationRepository.remove(notification);
  }

  async deleteAllNotifications(companyId: string): Promise<void> {
    await this.notificationRepository.delete({ companyId });
  }
}