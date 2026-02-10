// export interface StaffResponse {
//     staffId: string;
//     companyId: string;
//     userId: string;
//     email: string;
//     firstName: string;
//     lastName: string;
//     phone: string | null;
//     isAvailable: boolean;
//     skills: string[];
//     createdAt: string;
//     updatedAt: string;
// }


// src/features/staff/interfaces/Staff_Response.interface.ts

export interface StaffResponse {
    staff_id: string;
    company_id: string;
    user_id: string;
    
    // Personal Info
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    
    // Staff Status
    is_available: boolean;
    skills: string[];
    is_Active: boolean;
    
    // Employment
    created_at: Date;
    updated_at: Date;
    
    // 🔥 NEW: Work Metrics
    work_metrics: {
        total_hours_worked: number;
        current_month_hours: number;
    };
    
    // 🔥 NEW: Next Confirmed Booking
    next_confirmed_booking: {
        booking_id: string;
        booking_number: string;
        status: string;
        scheduled_date: Date;
        scheduled_time_start: string;
        scheduled_time_end: string | null;
        service_location: string;
        customer_name: string;
        customer_phone: string | null;
        service_name: string;
        service_category: string;
        total_amount: number;
        hours_scheduled: number;
    } | null;
}


export interface StaffListResponse {
    staff: StaffResponse[];
    total: number;
    page: number;
    limit: number;
}