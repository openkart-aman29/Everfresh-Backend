/**
 * Common Zod Validation Schemas for Bookings
 * Reusable across different booking operations
 */

import { z } from 'zod';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

// ULID Schemas
export const bookingIdZodSchema = ulidZodSchema;

export const companyIdZodSchema = ulidZodSchema;

export const customerIdZodSchema = ulidZodSchema;

export const serviceIdZodSchema = ulidZodSchema;

export const staffIdZodSchema = ulidZodSchema.optional().nullable();

// Date and Time Schemas
export const scheduledDateZodSchema = z.coerce.date({
  required_error: "Scheduled date is required",
  invalid_type_error: "Invalid date format"
}).refine(
  (date) => date >= new Date(new Date().setHours(0, 0, 0, 0)),
  "Cannot schedule in the past"
);

export const timeFormatZodSchema = z.string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)");

// Status Schema
export const bookingStatusZodSchema = z.enum([
  'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'
]);

// Quantity Schema
export const quantityZodSchema = z.number()
  .int("Quantity must be an integer")
  .min(1, "Quantity must be at least 1")
  .max(100, "Quantity cannot exceed 100");

// Location Schema
export const serviceLocationZodSchema = z.string()
  .min(5, "Service location must be at least 5 characters")
  .max(255, "Service location cannot exceed 255 characters");

// Instructions Schema
export const specialInstructionsZodSchema = z.string()
  .max(1000, "Special instructions cannot exceed 1000 characters")
  .optional()
  .nullable();

// Discount Schema
export const discountAmountZodSchema = z.number()
  .min(0, "Discount cannot be negative")
  .optional()
  .default(0);

// Addon Schema
export const addonIdsZodSchema = z.array(
  ulidZodSchema
).optional();

// Cancellation Reason Schema
export const cancellationReasonZodSchema = z.string()
  .min(10, "Cancellation reason must be at least 10 characters")
  .max(500, "Cancellation reason cannot exceed 500 characters");

// General Reason Schema
export const reasonZodSchema = z.string()
  .min(5, "Reason must be at least 5 characters")
  .max(500, "Reason cannot exceed 500 characters");
