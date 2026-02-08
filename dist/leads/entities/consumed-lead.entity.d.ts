import { Company } from '../../company/entities/company.entity';
import { Lead } from './lead.entity';
export declare enum DealStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    NO_RESPONSE = "NO_RESPONSE"
}
export declare class ConsumedLead {
    id: string;
    companyId: string;
    leadId: string;
    consumedAt: Date;
    dealStatus: DealStatus;
    dealNotes: string;
    dealValue: number;
    statusUpdatedAt: Date;
    updatedAt: Date;
    company: Company;
    lead: Lead;
}
