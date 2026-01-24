import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

// ULID validation for customer ID
export const customerIdParamSchema = z.object({
    customerId: ulidZodSchema,
});

// Pagination schema
export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
});

// Search query schema
export const searchQuerySchema = z.object({
    q: z.string().min(1, 'Search query cannot be empty').max(255, 'Search query too long').optional(),
});

// Combined query schema for get all customers
export const readAllCustomersQuerySchema = z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
    search: z.string().min(2, 'Search query must be at least 2 characters').optional(),
    sortBy: z.enum(['created_at', 'first_name', 'last_name', 'email'], {
        errorMap: () => ({ message: 'Sort by must be one of: created_at, first_name, last_name, email' })
    }).default('created_at'),
    sortOrder: z.enum(['asc', 'desc'], {
        errorMap: () => ({ message: 'Sort order must be asc or desc' })
    }).default('desc'),
});

// Update customer body schema
export const updateCustomerBodySchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100, 'First name cannot exceed 100 characters').optional(),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100, 'Last name cannot exceed 100 characters').optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one field must be provided for update');