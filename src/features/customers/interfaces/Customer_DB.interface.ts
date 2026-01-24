export interface CustomerDBInterface {
    customer_id: string;
    company_id: string;
    user_id: string;
    total_bookings: number;
    lifetime_value: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CustomerWithUserDBInterface extends CustomerDBInterface {
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
}