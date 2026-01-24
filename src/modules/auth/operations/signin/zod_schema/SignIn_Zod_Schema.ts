import { z } from 'zod';
import { emailZodSchema } from '@/modules/auth/zod_schema/Auth_Global_Zod_Schema';

export const signInZodSchema = z.object({
    email: emailZodSchema,
    password: z.string().min(1, 'Password is required')
});

export type SignInInput = z.infer<typeof signInZodSchema>;