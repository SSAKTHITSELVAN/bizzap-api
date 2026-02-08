import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { SignupAnalyticsQueryDto } from './dto/signup-analytics-query.dto';
export declare class AdminCompanyController {
    private readonly companyService;
    constructor(companyService: CompanyService);
    create(createCompanyDto: CreateCompanyDto): Promise<{
        message: string;
        data: import("./entities/company.entity").Company;
    }>;
    findAll(): Promise<{
        message: string;
        data: import("./entities/company.entity").Company[];
    }>;
    getActiveUserMetrics(): Promise<{
        message: string;
        data: {
            dailyActiveUsers: number;
            weeklyActiveUsers: number;
            monthlyActiveUsers: number;
        };
    }>;
    getCompanyMetrics(): Promise<{
        message: string;
        data: {
            totalRegisteredCompanies: number;
            newSignupsPerMonth: any[];
            profileCompletionPercentage: number;
            categoryBreakdown: any[];
        };
    }>;
    getDailySignups(query: SignupAnalyticsQueryDto): Promise<{
        message: string;
        data: {
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
        };
    }>;
    getWeeklySignups(query: SignupAnalyticsQueryDto): Promise<{
        message: string;
        data: {
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
        };
    }>;
    getMonthlySignups(query: SignupAnalyticsQueryDto): Promise<{
        message: string;
        data: {
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
        };
    }>;
    getYearlySignups(query: SignupAnalyticsQueryDto): Promise<{
        message: string;
        data: {
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
        };
    }>;
    getSignupSummary(): Promise<{
        message: string;
        data: {
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
        };
    }>;
    getCompanyProfileCompletion(id: string): Promise<{
        message: string;
        data: {
            companyId: string;
            completionPercentage: number;
        };
    }>;
    findOne(id: string): Promise<{
        message: string;
        data: import("./entities/company.entity").Company;
    }>;
    update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<{
        message: string;
        data: import("./entities/company.entity").Company;
    }>;
    remove(id: string): Promise<{
        message: string;
        data: null;
    }>;
}
