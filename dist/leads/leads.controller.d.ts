import { LeadsService } from './leads.service';
import { AiLeadExtractionService } from './ai-lead-extraction.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { DeactivateLeadDto } from './dto/deactivate-lead.dto';
import { UpdateConsumedLeadStatusDto } from './dto/update-consumed-lead-status.dto';
import { ExtractLeadFromTextDto } from './dto/extract-lead-from-text.dto';
export declare class LeadsController {
    private readonly leadsService;
    private readonly aiLeadExtractionService;
    constructor(leadsService: LeadsService, aiLeadExtractionService: AiLeadExtractionService);
    findAllPublic(): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead[];
    }>;
    findOnePublic(id: string): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead;
    }>;
    getAvailableLeads(req: any): Promise<{
        message: string;
        data: {
            leads: import("./entities/lead.entity").Lead[];
            count: number;
        };
    }>;
    extractLeadFromText(req: any, extractDto: ExtractLeadFromTextDto): Promise<{
        message: string;
        data: import("./ai-lead-extraction.service").ExtractedLeadData;
    }>;
    create(req: any, createLeadDto: CreateLeadDto, image?: Express.Multer.File): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead;
    }>;
    findMyLeads(req: any): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead[];
    }>;
    findMyActiveLeads(req: any): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead[];
    }>;
    findMyInactiveLeads(req: any): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead[];
    }>;
    findOne(id: string): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead;
    }>;
    update(req: any, id: string, updateLeadDto: UpdateLeadDto, image?: Express.Multer.File): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead;
    }>;
    toggleStatus(req: any, id: string, isActive: boolean): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead;
    }>;
    deactivate(req: any, id: string, deactivateDto: DeactivateLeadDto): Promise<{
        message: string;
        data: import("./entities/lead.entity").Lead;
    }>;
    remove(req: any, id: string): Promise<{
        message: string;
        data: null;
    }>;
    consumeLead(req: any, id: string): Promise<{
        message: string;
        data: null;
    } | {
        message: string;
        data: {
            contact: string | undefined;
        };
    }>;
    getLeadImage(id: string): Promise<{
        message: string;
        data: {
            imageUrl: string;
        };
    }>;
    getMyConsumedLeadsWithStatus(req: any): Promise<{
        message: string;
        data: import("./entities/consumed-lead.entity").ConsumedLead[];
    }>;
    getConsumedLeadDetails(req: any, id: string): Promise<{
        message: string;
        data: import("./entities/consumed-lead.entity").ConsumedLead;
    }>;
    updateConsumedLeadStatus(req: any, id: string, updateStatusDto: UpdateConsumedLeadStatusDto): Promise<{
        message: string;
        data: import("./entities/consumed-lead.entity").ConsumedLead;
    }>;
}
