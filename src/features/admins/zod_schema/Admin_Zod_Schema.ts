
import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';
import {
    emailZodSchema,
    nameZodSchema,
    phoneZodSchema
} from '@/modules/auth/zod_schema/Auth_Global_Zod_Schema';
// ULID validation for admin ID
export const adminReadParamsSchema = z.object({
    admin_id: ulidZodSchema,
});


// Zod schema for Read All Admins query parameters
export const readAllAdminsQuerySchema = z.object({
    page: z.string().optional().default('1').transform(Number),
    limit: z.string().optional().default('10').transform(Number),
    search: z.string().optional(),
    sort_by: z.enum(['first_name', 'last_name', 'email', 'created_at']).optional().default('created_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
    is_active: z.enum(['true', 'false']).optional().transform(val => val === 'true').optional(),
    company_id: ulidZodSchema.optional()
});

export type ReadAllAdminsQueryInput = z.infer<typeof readAllAdminsQuerySchema>;

// Zod schema for updating admin details
export const updateAdminBodySchema = z.object({
    first_name: nameZodSchema,
    last_name: nameZodSchema,
    email: emailZodSchema,
    phone: phoneZodSchema,
    is_active: z.boolean().optional()
});

export const deleteAdminParamsSchema = z.object({
    admin_id: ulidZodSchema,
});

export type UpdateAdminBodyInput = z.infer<typeof updateAdminBodySchema>;