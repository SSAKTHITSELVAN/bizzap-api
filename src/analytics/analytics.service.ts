// // src/analytics/analytics.service.ts
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, In } from 'typeorm'; // 👈 Import 'In' operator
// import { AnalyticsLog } from './entities/analytics-log.entity';
// import { Company } from '../company/entities/company.entity'; // 👈 Import Company
// import { CreateAnalyticsDto } from './dto/create-analytics.dto';

// @Injectable()
// export class AnalyticsService {
//   constructor(
//     @InjectRepository(AnalyticsLog)
//     private analyticsRepo: Repository<AnalyticsLog>,
//     @InjectRepository(Company)
//     private companyRepo: Repository<Company>, // 👈 Inject Company Repository
//   ) {}

//   async logScreenView(companyId: string, data: CreateAnalyticsDto) {
//     const log = this.analyticsRepo.create({
//       ...data,
//       companyId,
//     });
//     return await this.analyticsRepo.save(log);
//   }

//   async getScreenAnalytics() {
//     return await this.analyticsRepo
//       .createQueryBuilder('log')
//       .select('log.screenName', 'screenName')
//       .addSelect('COUNT(log.id)', 'visitCount')
//       .addSelect('AVG(log.durationMs) / 1000', 'avgTimeSeconds')
//       .addSelect('SUM(log.durationMs) / 1000 / 3600', 'totalTimeHours')
//       .groupBy('log.screenName')
//       .orderBy('COUNT(log.id)', 'DESC')
//       .getRawMany();
//   }

//   // =================================================================
//   // 👥 2. CURRENT ACTIVE USERS (With Names)
//   // =================================================================
//   async getActiveUsers() {
//     const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
//     // 1. Get raw logs
//     const activeLogs = await this.analyticsRepo
//       .createQueryBuilder('log')
//       .select(['log.companyId', 'log.screenName', 'log.exitTime'])
//       .where('log.exitTime > :fiveMinutesAgo', { fiveMinutesAgo })
//       .distinctOn(['log.companyId'])
//       .orderBy('log.companyId')
//       .addOrderBy('log.exitTime', 'DESC')
//       .getMany();

//     if (activeLogs.length === 0) return [];

//     // 2. Fetch Company Names
//     const companyIds = activeLogs.map(l => l.companyId);
//     const companies = await this.companyRepo.find({
//       where: { id: In(companyIds) },
//       select: ['id', 'companyName'], //
//     });

//     // 3. Map names to logs
//     const nameMap = new Map(companies.map(c => [c.id, c.companyName]));

//     return activeLogs.map(log => ({
//       ...log,
//       companyName: nameMap.get(log.companyId) || 'Unknown Company',
//     }));
//   }

//   // =================================================================
//   // 📅 3. USER ENGAGEMENT (With Company Name)
//   // =================================================================
//   async getUserEngagement(period: 'day' | 'week' | 'month', userId?: string) {
//     let dateFilter = new Date();
//     if (period === 'day') dateFilter.setHours(0, 0, 0, 0);
//     if (period === 'week') dateFilter.setDate(dateFilter.getDate() - 7);
//     if (period === 'month') dateFilter.setMonth(dateFilter.getMonth() - 1);

//     // 1. Base Query: Get Top Users with Total Time
//     const query = this.analyticsRepo
//       .createQueryBuilder('log')
//       .select('log.companyId', 'userId')
//       .addSelect('SUM(log.durationMs) / 1000 / 60', 'totalMinutes')
//       .where('log.exitTime >= :dateFilter', { dateFilter })
//       .groupBy('log.companyId')
//       .orderBy('SUM(log.durationMs)', 'DESC');

//     if (userId) {
//       query.andWhere('log.companyId = :userId', { userId });
//     } else {
//       query.limit(20); 
//     }

//     const topUsers = await query.getRawMany();

//     if (topUsers.length === 0) return [];

//     // 2. Fetch Detailed Logs & Company Names
//     const userIds = topUsers.map(u => u.userId);

//     // Run parallel queries for efficiency
//     const [detailsQuery, companies] = await Promise.all([
//       this.analyticsRepo
//         .createQueryBuilder('log')
//         .select(['log.companyId', 'log.screenName', 'log.durationMs', 'log.exitTime'])
//         .where('log.companyId IN (:...userIds)', { userIds })
//         .andWhere('log.exitTime >= :dateFilter', { dateFilter })
//         .getMany(),
      
//       this.companyRepo.find({
//         where: { id: In(userIds) },
//         select: ['id', 'companyName'], //
//       })
//     ]);

//     // Create Name Lookup Map
//     const nameMap = new Map(companies.map(c => [c.id, c.companyName]));

//     // 3. Process Data
//     return topUsers.map(user => {
//       const userLogs = detailsQuery.filter(log => log.companyId === user.userId);

//       // A. Split Screen Counts
//       const screenVisits = {};
//       userLogs.forEach(log => {
//         screenVisits[log.screenName] = (screenVisits[log.screenName] || 0) + 1;
//       });

//       // B. Calculate Peak Time Range
//       const hourBuckets = new Array(24).fill(0);
//       userLogs.forEach(log => {
//         const hour = new Date(log.exitTime).getHours();
//         hourBuckets[hour] += log.durationMs;
//       });

//       let maxDuration = 0;
//       let peakHour = 0;
//       hourBuckets.forEach((duration, hour) => {
//         if (duration > maxDuration) {
//           maxDuration = duration;
//           peakHour = hour;
//         }
//       });
      
//       const peakTimeRange = `${peakHour.toString().padStart(2, '0')}:00 - ${(peakHour + 1).toString().padStart(2, '0')}:00`;

//       return {
//         companyId: user.userId,
//         companyName: nameMap.get(user.userId) || 'Unknown', // 👈 New Field
//         totalMinutes: parseFloat(user.totalMinutes).toFixed(1),
//         screenVisits: screenVisits,
//         peakTimeRange: maxDuration > 0 ? peakTimeRange : 'N/A'
//       };
//     });
//   }

//   // =================================================================
//   // 🔍 4. SCREEN FLOW
//   // =================================================================
//   async getCurrentUserDistribution() {
//     const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

//     const query = `
//       SELECT 
//         "screenName", 
//         COUNT(DISTINCT "companyId") as "userCount",
//         array_agg(DISTINCT "companyId") as "activeUserIds"
//       FROM analytics_logs
//       WHERE "exitTime" > $1
//       GROUP BY "screenName"
//       ORDER BY "userCount" DESC
//     `;
    
//     const result = await this.analyticsRepo.query(query, [fifteenMinutesAgo]);
    
//     // Optional: If you also want names here, we need to fetch them
//     // Collect all IDs from all screens
//     const allIds = result.flatMap(r => r.activeUserIds);
//     if(allIds.length === 0) return result;

//     const companies = await this.companyRepo.find({
//         where: { id: In(allIds) },
//         select: ['id', 'companyName']
//     });
//     const nameMap = new Map(companies.map(c => [c.id, c.companyName]));

//     return result.map(group => ({
//         ...group,
//         activeUsers: group.activeUserIds.map(id => ({
//             id,
//             name: nameMap.get(id) || 'Unknown'
//         }))
//     }));
//   }
// }


// src/analytics/analytics.service.ts
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

  async logScreenView(companyId: string, data: CreateAnalyticsDto) {
    const log = this.analyticsRepo.create({
      ...data,
      companyId,
    });
    return await this.analyticsRepo.save(log);
  }

  // ... (Keep getScreenAnalytics, getActiveUsers, getUserEngagement as they are) ...

  async getScreenAnalytics() {
    return await this.analyticsRepo
      .createQueryBuilder('log')
      .select('log.screenName', 'screenName')
      .addSelect('COUNT(log.id)', 'visitCount')
      .addSelect('AVG(log.durationMs) / 1000', 'avgTimeSeconds')
      .addSelect('SUM(log.durationMs) / 1000 / 3600', 'totalTimeHours')
      .groupBy('log.screenName')
      .orderBy('COUNT(log.id)', 'DESC')
      .getRawMany();
  }

  async getActiveUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // 1. Get raw logs
    const activeLogs = await this.analyticsRepo
      .createQueryBuilder('log')
      .select(['log.companyId', 'log.screenName', 'log.exitTime'])
      .where('log.exitTime > :fiveMinutesAgo', { fiveMinutesAgo })
      .distinctOn(['log.companyId'])
      .orderBy('log.companyId')
      .addOrderBy('log.exitTime', 'DESC')
      .getMany();

    if (activeLogs.length === 0) return [];

    // 2. Fetch Company Names
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
      userLogs.forEach(log => {
        screenVisits[log.screenName] = (screenVisits[log.screenName] || 0) + 1;
      });

      const hourBuckets = new Array(24).fill(0);
      userLogs.forEach(log => {
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

  // =================================================================
  // 🔍 4. SCREEN FLOW (UPDATED: Shows only LATEST screen per user)
  // =================================================================
  async getCurrentUserDistribution() {
    // 1. Reduce window to 5 minutes for "Real Time" feel
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 2. CTE Query: 
    //    Step A: "LatestActivity" gets ONLY the most recent log per companyId
    //    Step B: Group the results of Step A by screenName
    const query = `
      WITH "LatestActivity" AS (
        SELECT DISTINCT ON ("companyId") 
          "companyId", 
          "screenName", 
          "exitTime"
        FROM analytics_logs
        WHERE "exitTime" > $1
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
    
    // 3. Fetch names for the active IDs
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