import { z } from 'zod';
import {
    emailZodSchema,
    passwordZodSchema,
    nameZodSchema,
    phoneZodSchema
} from '@/modules/auth/zod_schema/Auth_Global_Zod_Schema';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

export const customerSignUpZodSchema = z.object({
    company_id: ulidZodSchema,
    email: emailZodSchema,
    password: passwordZodSchema,
    first_name: nameZodSchema,
    last_name: nameZodSchema,
    phone: phoneZodSchema,
    // address: z.string().max(500).optional(),
    // preferred_contact: z.enum(['email', 'phone', 'sms', 'whatsapp']).default('email')
});

export type CustomerSignUpInput = z.infer<typeof customerSignUpZodSchema>;