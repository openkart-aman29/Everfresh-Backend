// src/features/bookings/operations/read_all/zod_schema/Read_All_Bookings_Zod_Schema.ts
import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';
import { bookingStatusZodSchema } from '@/features/company/bookings/zod_schema/Booking_Zod_Schema';

export const readAllBookingsZodSchema = z.object({
    // Pagination
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    
    // Sorting
    sort_by: z.enum([
        'scheduled_date', 
        'created_at', 
        'updated_at', 
        'total_amount',
        'booking_number'
    ]).default('scheduled_date'),
    sort_order: z.enum(['ASC', 'DESC']).default('DESC'),
    
    // Filters
    customer_id: ulidZodSchema.optional(),
    service_id: ulidZodSchema.optional(),
    staff_id: ulidZodSchema.optional(),
    status: z.union([
        bookingStatusZodSchema,
        z.array(bookingStatusZodSchema)
    ]).optional(),
    
    // Date range
    scheduled_date_from: z.coerce.date().optional(),
    scheduled_date_to: z.coerce.date().optional(),
    
    // Search
    search: z.string().max(100).optional(),
    
    // Payment status
    payment_status: z.enum(['unpaid', 'partial', 'paid']).optional()
});

export type ReadAllBookingsInput = z.infer<typeof readAllBookingsZodSchema>;
