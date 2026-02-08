import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { ConsumedLead } from '../leads/entities/consumed-lead.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { S3Service } from '../chat/s3.service';
import { LeadQuotaDetailsDto } from './dto/lead-quota-details.dto';
export declare class CompanyService {
    private companyRepository;
    private consumedLeadRepository;
    private s3Service;
    constructor(companyRepository: Repository<Company>, consumedLeadRepository: Repository<ConsumedLead>, s3Service: S3Service);
    resetMonthlyQuotas(): Promise<void>;
    getCompanyWithSignedUrls(company: Company): Promise<any>;
    getLeadQuotaDetails(companyId: string): Promise<LeadQuotaDetailsDto>;
    updateWithFiles(id: string, updateCompanyDto: UpdateCompanyDto, files?: {
        userPhoto?: Express.Multer.File[];
        logo?: Express.Multer.File[];
        coverImage?: Express.Multer.File[];
    }): Promise<Company>;
    create(createCompanyDto: CreateCompanyDto): Promise<Company>;
    canPostLead(companyId: string): Promise<boolean>;
    incrementPostedLeads(companyId: string): Promise<void>;
    consumeLead(companyId: string): Promise<boolean>;
    getConsumedLeads(companyId: string): Promise<any[]>;
    findAll(): Promise<Company[]>;
    findOne(id: string): Promise<Company>;
    findByPhone(phoneNumber: string): Promise<Company | null>;
    update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company>;
    updateLastLoginDate(companyId: string): Promise<void>;
    remove(id: string): Promise<void>;
    private generateReferralCode;
    getDailyActiveUsers(): Promise<number>;
    getWeeklyActiveUsers(): Promise<number>;
    getMonthlyActiveUsers(): Promise<number>;
    getCompaniesByCategory(): Promise<any[]>;
    getTotalRegisteredCompanies(): Promise<number>;
    getNewSignupsPerMonth(): Promise<any[]>;
    getProfileCompletionPercentage(): Promise<number>;
    getCompanyProfileCompletion(id: string): Promise<number>;
    private getDateRange;
    private getCompanySummary;
    getDailySignupAnalytics(startDate?: string, endDate?: string): Promise<{
        totalSignups: number;
        dateRange: {
            start: string;
            end: string;
        };
        dailyBreakdown: {
            date: string;
            count: number;
            companies: {
                id: string;
                companyName: string;
                phoneNumber: string;
                category: string;
                gstNumber: string;
                referralCode: string;
                createdAt: Date;
            }[];
        }[];
    }>;
    getWeeklySignupAnalytics(startDate?: string, endDate?: string): Promise<{
        totalSignups: number;
        dateRange: {
            start: string;
            end: string;
        };
        weeklyBreakdown: {
            weekNumber: number;
            year: number;
            weekStart: string;
            weekEnd: string;
            count: number;
            companies: {
                id: string;
                companyName: string;
                phoneNumber: string;
                category: string;
                gstNumber: string;
                referralCode: string;
                createdAt: Date;
            }[];
        }[];
    }>;
    getMonthlySignupAnalytics(startDate?: string, endDate?: string): Promise<{
        totalSignups: number;
        dateRange: {
            start: string;
            end: string;
        };
        monthlyBreakdown: {
            month: string;
            year: number;
            monthYear: string;
            count: number;
            companies: {
                id: string;
                companyName: string;
                phoneNumber: string;
                category: string;
                gstNumber: string;
                referralCode: string;
                createdAt: Date;
            }[];
        }[];
    }>;
    getYearlySignupAnalytics(startDate?: string, endDate?: string): Promise<{
        totalSignups: number;
        dateRange: {
            start: string;
            end: string;
        };
        yearlyBreakdown: {
            year: number;
            count: number;
            companies: {
                id: string;
                companyName: string;
                phoneNumber: string;
                category: string;
                gstNumber: string;
                referralCode: string;
                createdAt: Date;
            }[];
        }[];
    }>;
    getSignupSummary(): Promise<{
        today: {
            count: number;
            growthPercent: number;
        };
        thisWeek: {
            count: number;
            growthPercent: number;
        };
        thisMonth: {
            count: number;
            growthPercent: number;
        };
        thisYear: {
            count: number;
            growthPercent: number;
        };
        allTime: {
            count: number;
        };
    }>;
}
