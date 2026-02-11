import { z } from 'zod';
import { emailZodSchema, passwordZodSchema } from '@/modules/auth/zod_schema/Auth_Global_Zod_Schema';

export const signInZodSchema = z.object({
    email: emailZodSchema,
    password: passwordZodSchema
});

export type SignInInput = z.infer<typeof signInZodSchema>;