export interface StaffDBInterface {
    staff_id: string;
    company_id: string;
    user_id: string;
    is_available: boolean;
    skills: string[];
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface StaffWithUserDBInterface extends StaffDBInterface {
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
}