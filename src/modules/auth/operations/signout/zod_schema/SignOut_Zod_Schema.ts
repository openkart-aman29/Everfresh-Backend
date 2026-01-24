import { z } from 'zod';
import { refreshTokenZodSchema } from '@/modules/auth/zod_schema/Auth_Global_Zod_Schema';

export const signOutZodSchema = z.object({
    refreshToken: refreshTokenZodSchema
});

export type SignOutInput = z.infer<typeof signOutZodSchema>;