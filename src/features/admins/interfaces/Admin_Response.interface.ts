export interface AdminDetailsResponse {
    admin_id: string;
    user_id: string;
    company_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    is_active: boolean;
    email_verified: boolean;
    phone_verified: boolean;
    last_login: Date | null;
    created_at: Date;
    updated_at: Date;
    roles: string[];
}

export interface PaginatedAdminResponse {
    data: AdminDetailsResponse[];
    pagination: {
        page: number;
        limit: number;
        totalRecords: number;
        totalPages: number;
    };
}