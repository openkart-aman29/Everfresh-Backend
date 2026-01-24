// src/features/bookings/operations/assign_staff/zod_schema/Assign_Staff_Zod_Schema.ts
import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

export const assignStaffZodSchema = z.object({
    staff_id: ulidZodSchema,
    
    notify_staff: z.boolean().default(true).optional(),
    notify_customer: z.boolean().default(false).optional(),
    
    notes: z.string()
        .max(500, "Notes cannot exceed 500 characters")
        .optional()
});

export type AssignStaffInput = z.infer<typeof assignStaffZodSchema>;
