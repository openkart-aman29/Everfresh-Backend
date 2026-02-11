import { RecordIDInterface } from '@/utilities/global_interfaces/Record_ID_Interface';
import { AccessTokenRequestInterface, RefreshTokenRequestInterface } from '@/modules/auth/interface/Token_Interface';
// User creation interface
export interface CreateUserInterface {
    user_id: string;
    company_id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone: string;
    is_active: boolean;
    email_verified: boolean;
    phone_verified: boolean;
}

// User response interface (without sensitive data)
export interface UserResponseInterface {
    user_id: string;
    company_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    is_active: boolean;
    email_verified: boolean;
    roles: string[];
    domain_type?: string | null;
    domain_id?: string | null;
    created_at: Date;
}

// SignIn request interface
export interface SignInRequestInterface {
    email: string;
    password: string;
    device_info?: string;
}

// SignIn response interface
export interface SignInResponseInterface {
    accessToken: string;
    refreshToken: string;
    user: UserResponseInterface;
}

// Token payload interface
export interface TokenPayloadInterface {
    user_id: string;
    company_id: string;
    email: string;
    roles: string[];
}


export interface EnrichedAuthInterface extends AccessTokenRequestInterface, RefreshTokenRequestInterface, CreateUserInterface { }