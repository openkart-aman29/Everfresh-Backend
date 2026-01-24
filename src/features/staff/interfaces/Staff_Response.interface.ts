export interface StaffResponse {
    staffId: string;
    companyId: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    isAvailable: boolean;
    skills: string[];
    createdAt: string;
    updatedAt: string;
}

export interface StaffListResponse {
    staff: StaffResponse[];
    total: number;
    page: number;
    limit: number;
}