// Refresh token database interface
export interface RefreshTokenInterface {
    roles: string[];
    email: string;
    company_id: string;
    token_id: string;
    user_id: string;
    hashed_token: string;
    expires_at: Date;
    device_info?: string;
    ip_address?: string;
    last_used_at?: Date;
    revoked_at?: Date;
    created_at: Date;
}

export interface RefreshTokenDBInterface {
    token_id: string;
    user_id: string;
    hashed_token: string;
    expires_at: Date;
    device_info?: string;
    ip_address?: string;
    last_used_at?: Date | null;
    revoked_at?: Date | null;
    created_at?: Date;
}

// Token refresh request
export interface RefreshTokenRequestInterface {
    refreshToken: string;
}
export interface AccessTokenRequestInterface{
    accessToken:string
}

// Token refresh response
export interface RefreshTokenResponseInterface {
    accessToken: string;
    refreshToken: string;
}