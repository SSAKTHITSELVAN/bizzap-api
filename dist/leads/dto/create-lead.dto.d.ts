export declare class CreateLeadDto {
    title: string;
    description: string;
    budget?: string;
    quantity?: string;
    location?: string;
}
export declare class CreateLeadWithFileDto extends CreateLeadDto {
    image?: any;
}
