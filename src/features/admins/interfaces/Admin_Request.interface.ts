
export interface ReadAllAdminsInput {
    companyId: string | null;
    page: number;
    limit: number;
    offset: number;
    search?: string;
    sortBy: string;
    sortOrder: string;
    isActive?: boolean;
}

export interface UpdateAdminInput {
    adminId: string;
    companyId: string | null;
    updates: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        is_active?: boolean;
    };
}
