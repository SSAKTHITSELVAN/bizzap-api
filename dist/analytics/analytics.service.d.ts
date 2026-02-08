import { Repository } from 'typeorm';
import { AnalyticsLog } from './entities/analytics-log.entity';
import { Company } from '../company/entities/company.entity';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
export declare class AnalyticsService {
    private analyticsRepo;
    private companyRepo;
    constructor(analyticsRepo: Repository<AnalyticsLog>, companyRepo: Repository<Company>);
    logScreenView(companyId: string, data: CreateAnalyticsDto): Promise<AnalyticsLog>;
    logSessionEvent(companyId: string, status: 'OPEN' | 'CLOSE'): Promise<AnalyticsLog>;
    getScreenAnalytics(): Promise<any[]>;
    getActiveUsers(): Promise<any>;
    getUserEngagement(period: 'day' | 'week' | 'month', userId?: string): Promise<{
        companyId: any;
        companyName: string;
        totalMinutes: string;
        screenVisits: {};
        peakTimeRange: string;
    }[]>;
    getCurrentUserDistribution(): Promise<any>;
}
