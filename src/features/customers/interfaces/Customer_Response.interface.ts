export interface CustomerResponse {
    customer_id: string;
    company_id: string;
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    total_bookings: number;
    lifetime_value: number;
    created_at: string; // ISO string
    updated_at: string; // ISO string
}

export interface CustomerListResponse {
    customers: CustomerResponse[];
    total: number;
    page: number;
    limit: number;
}