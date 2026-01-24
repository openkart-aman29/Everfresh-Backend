// src/features/bookings/operations/update/zod_schema/Update_Booking_Zod_Schema.ts
import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';
import {
    scheduledDateZodSchema,
    timeFormatZodSchema
} from '@/features/company/bookings/zod_schema/Booking_Zod_Schema';

export const updateBookingZodSchema = z.object({
    scheduled_date: scheduledDateZodSchema.optional(),
    scheduled_time_start: timeFormatZodSchema.optional(),
    scheduled_time_end: timeFormatZodSchema.nullable().optional(),
    service_location: z.string()
        .min(10, "Service location must be at least 10 characters")
        .max(500, "Service location cannot exceed 500 characters")
        .optional(),
    staff_id: ulidZodSchema.nullable().optional(),
    special_instructions: z.string()
        .max(1000, "Instructions cannot exceed 1000 characters")
        .nullable()
        .optional()
}).refine(
    (data) => {
        if (data.scheduled_time_end && data.scheduled_time_start) {
            return data.scheduled_time_end > data.scheduled_time_start;
        }
        return true;
    },
    {
        message: "End time must be after start time",
        path: ["scheduled_time_end"]
    }
);

export type UpdateBookingInput = z.infer<typeof updateBookingZodSchema>;
