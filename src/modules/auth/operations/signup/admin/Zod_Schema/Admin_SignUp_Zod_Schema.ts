
import { z } from 'zod';
import {
    emailZodSchema,
    passwordZodSchema,
    nameZodSchema,
    phoneZodSchema
} from '@/modules/auth/zod_schema/Auth_Global_Zod_Schema';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';


export const adminSignUpZodSchema = z.object({
    company_id: ulidZodSchema,
    email: emailZodSchema,
    password: passwordZodSchema,
    first_name: nameZodSchema,
    last_name: nameZodSchema,
    phone: phoneZodSchema,
    role_code: z.literal('admin', {
        errorMap: () => ({ message: 'Role code must be "admin"' })
    })
});

export type AdminSignUpInput = z.infer<typeof adminSignUpZodSchema>;
