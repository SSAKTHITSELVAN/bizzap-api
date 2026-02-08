import { ConfigService } from '@nestjs/config';
export interface ExtractedLeadData {
    title: string | null;
    description: string | null;
    budget: string | null;
    quantity: string | null;
    location: string | null;
}
export declare class AiLeadExtractionService {
    private configService;
    private groqClient;
    constructor(configService: ConfigService);
    extractLeadDetails(userInput: string): Promise<ExtractedLeadData>;
    private buildSystemPrompt;
    private validateAndNormalizeResult;
}
