import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

// ULID validation for staff ID
export const staffIdParamSchema = z.object({
    staffId: ulidZodSchema,
});

// Read all staff query schema
export const readAllStaffQuerySchema = z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
    search: z.string().min(2, 'Search query must be at least 2 characters').optional(),
    sortBy: z.enum(['created_at', 'first_name', 'last_name', 'email'], {
        errorMap: () => ({ message: 'Sort by must be one of: created_at, first_name, last_name, email' })
    }).default('created_at'),
    sortOrder: z.enum(['asc', 'desc'], {
        errorMap: () => ({ message: 'Sort order must be asc or desc' })
    }).default('desc'),
    availableOnly: z.coerce.boolean().default(false),
});

// Update staff profile body schema
export const updateStaffProfileSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100, 'First name cannot exceed 100 characters').optional(),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100, 'Last name cannot exceed 100 characters').optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one field must be provided for update');

// Combined update staff body schema
export const updateStaffBodySchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(100, 'First name cannot exceed 100 characters').optional(),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(100, 'Last name cannot exceed 100 characters').optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
    isAvailable: z.boolean({
        invalid_type_error: 'Availability must be a boolean value'
    }).optional(),
    skills: z.array(z.string().min(1, 'Skill cannot be empty').max(50, 'Skill name too long'))
        .min(1, 'At least one skill required')
        .max(20, 'Cannot have more than 20 skills').optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one field must be provided for update');

// Update availability body schema
export const updateStaffAvailabilitySchema = z.object({
    isAvailable: z.boolean({
        invalid_type_error: 'Availability must be a boolean value'
    }),
});

// Update skills body schema
export const updateStaffSkillsSchema = z.object({
    skills: z.array(z.string().min(1, 'Skill cannot be empty').max(50, 'Skill name too long'))
        .min(1, 'At least one skill required')
        .max(20, 'Cannot have more than 20 skills'),
});


// Read assigned bookings query schema
export const readAssignedBookingsQuerySchema = z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
    status: z.string().optional(),
    fromDate: z.string().datetime({ offset: true }).optional(),
    toDate: z.string().datetime({ offset: true }).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).refine(data => {
    if (data.fromDate && data.toDate) {
        return new Date(data.fromDate) <= new Date(data.toDate);
    }
    return true;
}, 'fromDate must be before or equal to toDate');