import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AnalyticsLog } from './entities/analytics-log.entity';
import { Company } from '../company/entities/company.entity';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsLog)
    private analyticsRepo: Repository<AnalyticsLog>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
  ) {}

  // =================================================================
  // 📝 LOGGING METHODS
  // =================================================================

  async logScreenView(companyId: string, data: CreateAnalyticsDto) {
    const log = this.analyticsRepo.create({
      ...data,
      companyId,
    });
    return await this.analyticsRepo.save(log);
  }

  // 🆕 NEW: Log Session (OPEN/CLOSE)
  async logSessionEvent(companyId: string, status: 'OPEN' | 'CLOSE') {
    const now = new Date();
    const log = this.analyticsRepo.create({
      companyId,
      screenName: `APP_${status}`,
      entryTime: now,
      exitTime: now, // Important: This updates "Last Seen"
      durationMs: 0, 
    });
    return await this.analyticsRepo.save(log);
  }

  // =================================================================
  // 📈 ANALYTICS QUERIES
  // =================================================================

  async getScreenAnalytics() {
    return await this.analyticsRepo
      .createQueryBuilder('log')
      .select('log.screenName', 'screenName')
      .addSelect('COUNT(log.id)', 'visitCount')
      .addSelect('AVG(log.durationMs) / 1000', 'avgTimeSeconds')
      .addSelect('SUM(log.durationMs) / 1000 / 3600', 'totalTimeHours')
      .where("log.screenName NOT LIKE 'APP_%'") // Exclude session events
      .groupBy('log.screenName')
      .orderBy('COUNT(log.id)', 'DESC')
      .getRawMany();
  }

  // 🔄 UPDATED: Active Users Logic (Respects APP_CLOSE)
  async getActiveUsers() {
    // 1. Safety Net: Look back 10 minutes (if CLOSE signal fails)
    const timeWindow = new Date(Date.now() - 10 * 60 * 1000); 

    // 2. Query: Find LATEST log for each user. Remove if 'APP_CLOSE'.
    const query = `
      WITH "LatestLogs" AS (
        SELECT DISTINCT ON ("companyId") *
        FROM analytics_logs
        WHERE "exitTime" > $1
        ORDER BY "companyId", "exitTime" DESC
      )
      SELECT * FROM "LatestLogs"
      WHERE "screenName" != 'APP_CLOSE' 
    `;

    const activeLogs = await this.analyticsRepo.query(query, [timeWindow]);

    if (activeLogs.length === 0) return [];

    // 3. Hydrate Names
    const companyIds = activeLogs.map(l => l.companyId);
    const companies = await this.companyRepo.find({
      where: { id: In(companyIds) },
      select: ['id', 'companyName'],
    });

    const nameMap = new Map(companies.map(c => [c.id, c.companyName]));

    return activeLogs.map(log => ({
      ...log,
      companyName: nameMap.get(log.companyId) || 'Unknown Company',
    }));
  }

  async getUserEngagement(period: 'day' | 'week' | 'month', userId?: string) {
    let dateFilter = new Date();
    if (period === 'day') dateFilter.setHours(0, 0, 0, 0);
    if (period === 'week') dateFilter.setDate(dateFilter.getDate() - 7);
    if (period === 'month') dateFilter.setMonth(dateFilter.getMonth() - 1);

    const query = this.analyticsRepo
      .createQueryBuilder('log')
      .select('log.companyId', 'userId')
      .addSelect('SUM(log.durationMs) / 1000 / 60', 'totalMinutes')
      .where('log.exitTime >= :dateFilter', { dateFilter })
      .andWhere("log.screenName NOT LIKE 'APP_%'")
      .groupBy('log.companyId')
      .orderBy('SUM(log.durationMs)', 'DESC');

    if (userId) {
      query.andWhere('log.companyId = :userId', { userId });
    } else {
      query.limit(20);
    }

    const topUsers = await query.getRawMany();
    if (topUsers.length === 0) return [];

    const userIds = topUsers.map(u => u.userId);
    const [detailsQuery, companies] = await Promise.all([
      this.analyticsRepo
        .createQueryBuilder('log')
        .select(['log.companyId', 'log.screenName', 'log.durationMs', 'log.exitTime'])
        .where('log.companyId IN (:...userIds)', { userIds })
        .andWhere('log.exitTime >= :dateFilter', { dateFilter })
        .andWhere("log.screenName NOT LIKE 'APP_%'")
        .getMany(),
      
      this.companyRepo.find({
        where: { id: In(userIds) },
        select: ['id', 'companyName'],
      })
    ]);

    const nameMap = new Map(companies.map(c => [c.id, c.companyName]));

    return topUsers.map(user => {
      const userLogs = detailsQuery.filter(log => log.companyId === user.userId);
      const screenVisits = {};
      const hourBuckets = new Array(24).fill(0);

      userLogs.forEach(log => {
        screenVisits[log.screenName] = (screenVisits[log.screenName] || 0) + 1;
        const hour = new Date(log.exitTime).getHours();
        hourBuckets[hour] += log.durationMs;
      });

      let maxDuration = 0;
      let peakHour = 0;
      hourBuckets.forEach((duration, hour) => {
        if (duration > maxDuration) {
          maxDuration = duration;
          peakHour = hour;
        }
      });
      const peakTimeRange = `${peakHour.toString().padStart(2, '0')}:00 - ${(peakHour + 1).toString().padStart(2, '0')}:00`;

      return {
        companyId: user.userId,
        companyName: nameMap.get(user.userId) || 'Unknown',
        totalMinutes: parseFloat(user.totalMinutes).toFixed(1),
        screenVisits: screenVisits,
        peakTimeRange: maxDuration > 0 ? peakTimeRange : 'N/A'
      };
    });
  }

  async getCurrentUserDistribution() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const query = `
      WITH "LatestActivity" AS (
        SELECT DISTINCT ON ("companyId") 
          "companyId", 
          "screenName", 
          "exitTime"
        FROM analytics_logs
        WHERE "exitTime" > $1
          AND "screenName" != 'APP_CLOSE'
        ORDER BY "companyId", "exitTime" DESC
      )
      SELECT 
        "screenName", 
        COUNT("companyId") as "userCount",
        array_agg("companyId") as "activeUserIds"
      FROM "LatestActivity"
      GROUP BY "screenName"
      ORDER BY "userCount" DESC
    `;
    
    const result = await this.analyticsRepo.query(query, [fiveMinutesAgo]);
    
    const allIds = result.flatMap(r => r.activeUserIds);
    if (allIds.length === 0) return result;

    const companies = await this.companyRepo.find({
        where: { id: In(allIds) },
        select: ['id', 'companyName']
    });
    const nameMap = new Map(companies.map(c => [c.id, c.companyName]));

    return result.map(group => ({
        ...group,
        activeUsers: group.activeUserIds.map(id => ({
            id,
            name: nameMap.get(id) || 'Unknown'
        }))
    }));
  }
}