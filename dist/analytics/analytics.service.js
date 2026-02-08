"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const analytics_log_entity_1 = require("./entities/analytics-log.entity");
const company_entity_1 = require("../company/entities/company.entity");
let AnalyticsService = class AnalyticsService {
    analyticsRepo;
    companyRepo;
    constructor(analyticsRepo, companyRepo) {
        this.analyticsRepo = analyticsRepo;
        this.companyRepo = companyRepo;
    }
    async logScreenView(companyId, data) {
        const log = this.analyticsRepo.create({
            ...data,
            companyId,
        });
        return await this.analyticsRepo.save(log);
    }
    async logSessionEvent(companyId, status) {
        const now = new Date();
        const log = this.analyticsRepo.create({
            companyId,
            screenName: `APP_${status}`,
            entryTime: now,
            exitTime: now,
            durationMs: 0,
        });
        return await this.analyticsRepo.save(log);
    }
    async getScreenAnalytics() {
        return await this.analyticsRepo
            .createQueryBuilder('log')
            .select('log.screenName', 'screenName')
            .addSelect('COUNT(log.id)', 'visitCount')
            .addSelect('AVG(log.durationMs) / 1000', 'avgTimeSeconds')
            .addSelect('SUM(log.durationMs) / 1000 / 3600', 'totalTimeHours')
            .where("log.screenName NOT LIKE 'APP_%'")
            .groupBy('log.screenName')
            .orderBy('COUNT(log.id)', 'DESC')
            .getRawMany();
    }
    async getActiveUsers() {
        const timeWindow = new Date(Date.now() - 10 * 60 * 1000);
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
        if (activeLogs.length === 0)
            return [];
        const companyIds = activeLogs.map(l => l.companyId);
        const companies = await this.companyRepo.find({
            where: { id: (0, typeorm_2.In)(companyIds) },
            select: ['id', 'companyName'],
        });
        const nameMap = new Map(companies.map(c => [c.id, c.companyName]));
        return activeLogs.map(log => ({
            ...log,
            companyName: nameMap.get(log.companyId) || 'Unknown Company',
        }));
    }
    async getUserEngagement(period, userId) {
        let dateFilter = new Date();
        if (period === 'day')
            dateFilter.setHours(0, 0, 0, 0);
        if (period === 'week')
            dateFilter.setDate(dateFilter.getDate() - 7);
        if (period === 'month')
            dateFilter.setMonth(dateFilter.getMonth() - 1);
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
        }
        else {
            query.limit(20);
        }
        const topUsers = await query.getRawMany();
        if (topUsers.length === 0)
            return [];
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
                where: { id: (0, typeorm_2.In)(userIds) },
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
        if (allIds.length === 0)
            return result;
        const companies = await this.companyRepo.find({
            where: { id: (0, typeorm_2.In)(allIds) },
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
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(analytics_log_entity_1.AnalyticsLog)),
    __param(1, (0, typeorm_1.InjectRepository)(company_entity_1.Company)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map