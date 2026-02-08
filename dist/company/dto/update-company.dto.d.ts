import { CreateCompanyDto } from './create-company.dto';
declare const UpdateCompanyDto_base: import("@nestjs/mapped-types").MappedType<Partial<Omit<CreateCompanyDto, "phoneNumber" | "gstNumber" | "referralCode" | "referredBy">>>;
export declare class UpdateCompanyDto extends UpdateCompanyDto_base {
    companyName?: string;
    logo?: string;
    address?: string;
    description?: string;
    category?: string;
    userName?: string;
    userPhoto?: string;
    coverImage?: string;
    registeredAddress?: string;
    about?: string;
    operationalAddress?: string;
}
export {};
