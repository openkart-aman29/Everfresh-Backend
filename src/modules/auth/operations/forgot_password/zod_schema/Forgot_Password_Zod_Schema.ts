import { z } from 'zod';
import { emailZodSchema } from '@/modules/auth/zod_schema/Auth_Global_Zod_Schema';

export const forgotPasswordZodSchema = z.object({
    email: emailZodSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordZodSchema>;