import { z } from 'zod';

// Email validation
export const emailZodSchema = z
    .string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email cannot exceed 255 characters')
    .transform(email => email.toLowerCase());

// Password validation
export const passwordZodSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        'Password must contain at least one special character'
    );

// Name validation
export const nameZodSchema = z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Phone validation (international format)
export const phoneZodSchema = z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

// Date of birth validation
export const dateOfBirthZodSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .refine(date => {
        const parsed = new Date(date);
        const now = new Date();
        const minAge = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());
        return parsed <= minAge;
    }, 'Must be at least 13 years old')
    .optional();

// Address validation
export const addressZodSchema = z
    .object({
        street: z.string().min(5, 'Street address must be at least 5 characters').max(255, 'Street address cannot exceed 255 characters'),
        city: z.string().min(2, 'City must be at least 2 characters').max(100, 'City cannot exceed 100 characters'),
        state: z.string().min(2, 'State must be at least 2 characters').max(100, 'State cannot exceed 100 characters'),
        zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
        country: z.string().min(2, 'Country must be at least 2 characters').max(100, 'Country cannot exceed 100 characters')
    })
    .optional();

// Refresh token validation
export const refreshTokenZodSchema = z
    .string()
    .length(59, 'Invalid refresh token format'); // ULID (26) + '.' + random (32)