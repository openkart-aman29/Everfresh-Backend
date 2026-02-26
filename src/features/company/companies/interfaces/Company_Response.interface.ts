
export interface CompanyDetailsResponse {
    company_id: string;
    company_name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logo_url: string | null;
    subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise' | null;
    is_active: boolean;
    settings: any | null;
    timezone: string;
    currency: string;
    created_at: Date;
    updated_at: Date;

    // 🔥 NEW: Dashboard Metrics
    dashboard_metrics: {
        total_bookings: number;
        total_bookings_change_percent: number;  // vs last month

        revenue: number;
        revenue_change_percent: number;         // vs last month

        wait_list: number;
        wait_list_change_percent: number;       // vs last week

        active_agents: number;
        active_agents_change: number;           // vs last week

        completed_bookings: number;
        pending_bookings: number;
        confirmed_bookings: number;
        cancelled_bookings: number;
    };
}

export interface PaginatedCompanyResponse {
    data: CompanyDetailsResponse[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}