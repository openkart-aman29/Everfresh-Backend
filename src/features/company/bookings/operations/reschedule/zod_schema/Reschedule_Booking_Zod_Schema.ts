// src/features/bookings/operations/reschedule/zod_schema/Reschedule_Booking_Zod_Schema.ts
import { z } from 'zod';
import { scheduledDateZodSchema, timeFormatZodSchema } from '@/features/company/bookings/zod_schema/Booking_Zod_Schema';

export const rescheduleBookingZodSchema = z.object({
    new_scheduled_date: scheduledDateZodSchema,
    new_scheduled_time_start: timeFormatZodSchema,
    new_scheduled_time_end: timeFormatZodSchema.nullable().optional(),
    
    reason: z.string()
        .min(10, "Reason must be at least 10 characters")
        .max(500, "Reason cannot exceed 500 characters")
        .optional(),
    
    notify_customer: z.boolean().default(true).optional(),
    notify_staff: z.boolean().default(true).optional()
}).refine(
    (data) => {
        if (data.new_scheduled_time_end) {
            return data.new_scheduled_time_end > data.new_scheduled_time_start;
        }
        return true;
    },
    {
        message: "End time must be after start time",
        path: ["new_scheduled_time_end"]
    }
);

export type RescheduleBookingInput = z.infer<typeof rescheduleBookingZodSchema>;
