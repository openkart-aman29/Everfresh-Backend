// src/features/bookings/operations/cancel/zod_schema/Cancel_Booking_Zod_Schema.ts
import { z } from 'zod';

export const cancelBookingZodSchema = z.object({
    cancellation_reason: z.string()
        .min(10, "Cancellation reason must be at least 10 characters")
        .max(500, "Cancellation reason cannot exceed 500 characters"),
    
    notify_customer: z.boolean().default(true).optional(),
    notify_staff: z.boolean().default(true).optional()
});

export type CancelBookingInput = z.infer<typeof cancelBookingZodSchema>;
