import { Company } from '../../company/entities/company.entity';
import { Lead } from '../../leads/entities/lead.entity';
export declare enum NotificationType {
    NEW_LEAD = "NEW_LEAD",
    LEAD_CONSUMED = "LEAD_CONSUMED",
    ADMIN_BROADCAST = "ADMIN_BROADCAST",
    SYSTEM = "SYSTEM"
}
export declare class Notification {
    id: string;
    companyId: string;
    type: NotificationType;
    title: string;
    body: string;
    data: any;
    isRead: boolean;
    leadId?: string;
    createdAt: Date;
    updatedAt: Date;
    company?: Company;
    lead?: Lead;
}
