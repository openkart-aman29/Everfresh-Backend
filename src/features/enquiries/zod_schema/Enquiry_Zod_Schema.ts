import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

/**
 * Public-facing validation. Kept deliberately forgiving on shape (a visitor is
 * not filling in a booking) but strict on the contact details, since those are
 * the only way to follow the lead up.
 */
export const createEnquiryZodSchema = z.object({
    full_name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(150, 'Name cannot exceed 150 characters'),

    email: z
        .string()
        .trim()
        .toLowerCase()
        .email('A valid email address is required')
        .max(255, 'Email cannot exceed 255 characters'),

    // Permissive on format: international visitors write numbers many ways.
    phone: z
        .string()
        .trim()
        .min(7, 'Phone number must be at least 7 characters')
        .max(30, 'Phone number cannot exceed 30 characters')
        .regex(/^[+0-9().\-\s]+$/, 'Phone number contains invalid characters'),

    service_id: ulidZodSchema.nullable().optional(),

    service_name: z
        .string()
        .trim()
        .max(255, 'Service name cannot exceed 255 characters')
        .nullable()
        .optional(),

    message: z
        .string()
        .trim()
        .max(2000, 'Message cannot exceed 2000 characters')
        .nullable()
        .optional(),

    preferred_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Preferred date must be in YYYY-MM-DD format')
        .nullable()
        .optional(),

    // An arrival-window label as offered by the site, e.g. "10:00 - 12:00" or
    // "Flexible". Free text on purpose: the window set is a business decision
    // that belongs to the website, not a constraint to duplicate here.
    preferred_time: z
        .string()
        .trim()
        .max(20, 'Preferred time cannot exceed 20 characters')
        .nullable()
        .optional(),

    // Coordinates shared from the visitor's device. Validated as a real point
    // on Earth so a malformed payload cannot reach the geocoder or the table.
    latitude: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90')
        .nullable()
        .optional(),

    longitude: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180')
        .nullable()
        .optional(),

    // Metres of uncertainty reported by the device. Capped well past any real
    // reading so an absurd value cannot be stored.
    location_accuracy: z
        .number()
        .int('Location accuracy must be a whole number of metres')
        .min(0)
        .max(100000)
        .nullable()
        .optional(),
})
    // A lone coordinate cannot be placed on a map, so insist on the pair.
    .refine(
        (value) =>
            (value.latitude === null || value.latitude === undefined) ===
            (value.longitude === null || value.longitude === undefined),
        {
            message: 'Latitude and longitude must be supplied together',
            path: ['latitude'],
        }
    );

export const enquiryIdParamSchema = z.object({
    enquiryId: ulidZodSchema,
});

export const updateEnquiryStatusZodSchema = z.object({
    status: z.enum(['new', 'contacted', 'converted', 'closed'], {
        message: 'Status must be one of: new, contacted, converted, closed',
    }),
    admin_notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').nullable().optional(),
});

export const readAllEnquiriesQuerySchema = z.object({
    status: z.enum(['new', 'contacted', 'converted', 'closed']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateEnquiryInput = z.infer<typeof createEnquiryZodSchema>;
export type UpdateEnquiryStatusInput = z.infer<typeof updateEnquiryStatusZodSchema>;
export type ReadAllEnquiriesQuery = z.infer<typeof readAllEnquiriesQuerySchema>;
