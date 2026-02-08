import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { LogSessionDto } from './dto/log-session.dto';
export declare class AnalyticsController {
    private readonly analyticsService;
    private readonly logger;
    constructor(analyticsService: AnalyticsService);
    trackScreenView(createAnalyticsDto: CreateAnalyticsDto, req: any): Promise<import("./entities/analytics-log.entity").AnalyticsLog>;
    logSession(logSessionDto: LogSessionDto, req: any): Promise<import("./entities/analytics-log.entity").AnalyticsLog>;
    getScreenAnalytics(): Promise<any[]>;
    getActiveUsers(): Promise<any>;
    getUserEngagement(period: 'day' | 'week' | 'month', userId?: string): Promise<{
        companyId: any;
        companyName: string;
        totalMinutes: string;
        screenVisits: {};
        peakTimeRange: string;
    }[]>;
    getLiveDistribution(): Promise<any>;
}
