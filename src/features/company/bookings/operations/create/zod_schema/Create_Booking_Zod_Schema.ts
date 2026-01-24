// src/features/bookings/operations/create/zod_schema/Create_Booking_Zod_Schema.ts
import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';
import {
    scheduledDateZodSchema,
    timeFormatZodSchema,
    quantityZodSchema
} from '@/features/company/bookings/zod_schema/Booking_Zod_Schema';

export const createBookingZodSchema = z.object({
    company_id: ulidZodSchema,
    customer_id: ulidZodSchema,
    service_id: ulidZodSchema,
    staff_id: ulidZodSchema.nullable().optional(),
    
    // Scheduling
    scheduled_date: scheduledDateZodSchema,
    scheduled_time_start: timeFormatZodSchema,
    scheduled_time_end: timeFormatZodSchema.nullable().optional(),
    
    // Location
    service_location: z.string()
        .min(10, "Service location must be at least 10 characters")
        .max(500, "Service location cannot exceed 500 characters"),
    
    // Quantity
    quantity: quantityZodSchema.default(1),
    
    // Addons
    addon_ids: z.array(ulidZodSchema).optional(),
    
    // Pricing adjustments
    discount_amount: z.number()
        .min(0, "Discount cannot be negative")
        .max(999999.99, "Discount too large")
        .optional(),
    
    // Additional info
    special_instructions: z.string()
        .max(1000, "Instructions cannot exceed 1000 characters")
        .nullable()
        .optional()
}).refine(
    (data) => {
        // Validate end time is after start time
        if (data.scheduled_time_end) {
            return data.scheduled_time_end > data.scheduled_time_start;
        }
        return true;
    },
    {
        message: "End time must be after start time",
        path: ["scheduled_time_end"]
    }
);

export type CreateBookingInput = z.infer<typeof createBookingZodSchema>;
