import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { passwordManager } from '@/modules/auth/manager/Password_Manager';
import { checkUserExistByEmail, checkUserExistByPhone } from '@/modules/auth/database/dao/Check_User_Exist_DAO';
import { staffSignUpDAO } from '@/modules/auth/operations/signup/staff/dao/Staff_SignUp_DAO';
import { StaffSignUpInput } from '@/modules/auth/operations/signup/staff/zod_schema/Staff_SignUp_Zod_Schema';
import { UserResponseInterface } from '@/modules/auth/interface/Auth_Interface';

export const staffSignUpService = async (
    input: StaffSignUpInput,
    createdByUserId: string
): Promise<StandardResponseInterface<UserResponseInterface | null>> => {
    try {
        authLogger.info('Staff signup service', {
            email: input.email
        });

        /* 🔒 Enforce STAFF ONLY */
        if (input.role_code !== 'staff') {
            const status = 400;
            return {
                success: false,
                message: 'INVALID_ROLE',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'role_code', message: 'Only staff creation is allowed' }]
            };
        }

        /* 1️⃣ Email uniqueness */
        const exists = await checkUserExistByEmail(input.email);
        if (exists.exists) {
            const status = 409;
            return {
                success: false,
                message: 'EMAIL_ALREADY_EXISTS',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'email', message: 'Email already registered' }]
            };
        }

        /* 1️⃣ Phone uniqueness */
        const phoneExists = await checkUserExistByPhone(input.phone);
        if (phoneExists.exists) {
            const status = 409;
            return {
                success: false,
                message: 'PHONE_ALREADY_EXISTS',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'phone', message: 'Phone already registered' }]
            };
        }

        /* 2️⃣ Hash password */
        const passwordHash = await passwordManager.hashPassword(input.password);

        /* 3️⃣ Prepare user */
        const userId = generateULID();

        const userData = {
            user_id: userId,
            company_id: input.company_id,
            email: input.email.toLowerCase(),
            password_hash: passwordHash,
            first_name: input.first_name,
            last_name: input.last_name,
            phone: input.phone,
            is_active: true,
            email_verified: false,
            phone_verified: false
        };

        /* 4️⃣ Prepare staff profile (MANDATORY) */
        const staffData = {
            staff_id: generateULID(),
            company_id: input.company_id,
            user_id: userId
        };

        /* 5️⃣ Persist */
        const result = await staffSignUpDAO({
            userData,
            role_code: 'staff',
            staffData,
            assigned_by: createdByUserId
        });

        if (!result.success || !result.user || !result.staff) {
            const status = 500;
            return {
                success: false,
                message: 'STAFF_CREATION_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to create staff account' }]
            };
        }

        /* 6️⃣ Response */
        const response: UserResponseInterface = {
            user_id: result.user.user_id,
            company_id: result.user.company_id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            phone: result.user.phone,
            is_active: result.user.is_active,
            email_verified: result.user.email_verified,
            roles: ['staff'],
            created_at: result.user.created_at
        };

        return {
            success: true,
            message: 'STAFF_CREATED_SUCCESSFULLY',
            status: 201,
            code: 'SUCCESS',
            data: response,
            errors: []
        };

    } catch (error) {
        authLogger.error('Staff signup error', error);
        const status = 500;
        return {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }]
        };
    }
};
