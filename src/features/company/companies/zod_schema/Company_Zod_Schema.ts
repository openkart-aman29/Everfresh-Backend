
import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

// ULID validation for company ID
export const companyIdParamSchema = z.object({
    companyId: ulidZodSchema,
});

// Zod schema for Read All Companies query parameters
export const readAllCompaniesQuerySchema = z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('10').transform(Number),
    search: z.string().optional(),
    sortBy: z.string().optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    is_active: z.enum(['true', 'false']).optional().transform(val => val === undefined ? undefined : val === 'true'),
    subscription_tier: z.enum(['free', 'basic', 'premium', 'enterprise']).optional()
});

// Zod schema for Update Company Body
export const updateCompanyBodySchema = z.object({
    company_name: z.string().min(1, "Company name cannot be empty").optional(),
    slug: z.string().min(1, "Slug cannot be empty").optional(),
    email: z.string().email("Invalid email format").optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    logo_url: z.string().url("Invalid URL").optional().nullable(),
    subscription_tier: z.enum(['free', 'basic', 'premium', 'enterprise']).optional().nullable(),
    is_active: z.boolean().optional()
});
