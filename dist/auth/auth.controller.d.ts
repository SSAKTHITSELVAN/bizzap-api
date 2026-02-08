import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { GstDetailsDto } from './dto/gst-details.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    sendOtp(loginDto: LoginDto): Promise<{
        message: string;
        data: {
            otp?: string | undefined;
            phoneNumber: string;
        };
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        message: string;
        data: {
            token: string;
            company: any;
            isNewUser: boolean;
            phoneNumber?: undefined;
        };
    } | {
        message: string;
        data: {
            phoneNumber: string;
            isNewUser: boolean;
            token?: undefined;
            company?: undefined;
        };
    }>;
    register(registerDto: RegisterDto, files: {
        userPhoto?: Express.Multer.File[];
        logo?: Express.Multer.File[];
        coverImage?: Express.Multer.File[];
    }): Promise<{
        message: string;
        data: {
            token: string;
            company: any;
        };
    }>;
    getGstDetails(gstDetailsDto: GstDetailsDto): Promise<import("./dto/gst-response.dto").GstApiResponse>;
}
