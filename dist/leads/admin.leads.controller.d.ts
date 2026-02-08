import { LeadsService } from './leads.service';
export declare class AdminLeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    getAllConsumedLeadsWithStatus(): Promise<{
        message: string;
        data: import("./entities/consumed-lead.entity").ConsumedLead[];
    }>;
    getConsumedLeadMetrics(): Promise<{
        message: string;
        data: any;
    }>;
    getCompanyConsumedLeads(companyId: string): Promise<{
        message: string;
        data: import("./entities/consumed-lead.entity").ConsumedLead[];
    }>;
    getCompanyConversionMetrics(companyId: string): Promise<{
        message: string;
        data: any;
    }>;
    getMostConsumedLeads(): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead[];
    }>;
    getMostViewedLeads(): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead[];
    }>;
    getLeadsByLocation(): Promise<{
        message: string;
        data: any[];
    }>;
    getDeactivatedLeads(): Promise<{
        message: string;
        data: {
            inactive: import("./entities/lead.entity").Lead[];
            deleted: import("./entities/lead.entity").Lead[];
        };
    }>;
    getDeactivatedLeadsByReason(): Promise<{
        message: string;
        data: any[];
    }>;
    getLeadCountByDate(): Promise<{
        message: string;
        data: any[];
    }>;
    getLeadCountByMonth(): Promise<{
        message: string;
        data: any[];
    }>;
    getLeadAnalyticsSummary(): Promise<{
        message: string;
        data: {
            totalLeads: number;
            totalActiveLeads: number;
            totalConsumedLeads: number;
            conversionRate: any;
            averageLeadLifespan: number;
            averageConsumptionsPerLead: string;
        };
    }>;
}
