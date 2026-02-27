
export interface ReadAllCompaniesInput {
    page: number;
    limit: number;
    offset: number;
    search?: string;
    sortBy: string;
    sortOrder: string;
    is_active?: boolean;
    subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise';
}

export interface UpdateCompanyInput {
    company_name?: string;
    slug?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    logo_url?: string | null;
    subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise' | null;
    is_active?: boolean;
}

export interface CreateCompanyInput {
    company_name: string;
    slug?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    logo_url?: string | null;
    subscription_tier?: 'free' | 'basic' | 'premium' | 'enterprise' | null;
}
