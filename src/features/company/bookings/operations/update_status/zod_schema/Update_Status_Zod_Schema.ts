// src/features/bookings/operations/update_status/zod_schema/Update_Status_Zod_Schema.ts
import { z } from 'zod';
import { bookingStatusZodSchema } from '@/features/company/bookings/zod_schema/Booking_Zod_Schema';

export const updateStatusZodSchema = z.object({
    status: bookingStatusZodSchema,
    
    reason: z.string()
        .max(500, "Reason cannot exceed 500 characters")
        .optional(),
    
    actual_start_time: z.coerce.date().optional(),
    actual_end_time: z.coerce.date().optional()
}).refine(
    (data) => {
        // If status is 'in_progress', actual_start_time should be provided
        if (data.status === 'in_progress' && !data.actual_start_time) {
            return false;
        }
        
        // If status is 'completed', both times should be provided
        if (data.status === 'completed' && (!data.actual_start_time || !data.actual_end_time)) {
            return false;
        }
        
        return true;
    },
    {
        message: "Invalid status transition data",
        path: ["status"]
    }
);

export type UpdateStatusInput = z.infer<typeof updateStatusZodSchema>;
