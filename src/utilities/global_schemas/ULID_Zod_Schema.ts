import { z } from 'zod';

export const ulidZodSchema = z.string()
    .length(26, "ULID must be exactly 26 characters")
    .regex(/^[0-9A-HJKMNP-TV-Z]{26}$/i, "Invalid ULID format");