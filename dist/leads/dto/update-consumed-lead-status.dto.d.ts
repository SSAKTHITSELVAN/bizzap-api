import { DealStatus } from '../entities/consumed-lead.entity';
export declare class UpdateConsumedLeadStatusDto {
    dealStatus: DealStatus;
    dealNotes?: string;
    dealValue?: number;
}
