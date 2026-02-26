
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { passwordManager } from '@/modules/auth/manager/Password_Manager';
import { checkUserExistByEmail, checkUserExistByPhone } from '@/modules/auth/database/dao/Check_User_Exist_DAO';
import { adminSignUpDAO } from '@/modules/auth/operations/signup/admin/dao/Admin_SignUp_Dao';
import { AdminSignUpInput } from '@/modules/auth/operations/signup/admin/Zod_Schema/Admin_SignUp_Zod_Schema';
import { UserResponseInterface } from '@/modules/auth/interface/Auth_Interface';

export const adminSignUpService = async (
    input: AdminSignUpInput,
    createdByUserId: string
): Promise<StandardResponseInterface<UserResponseInterface | null>> => {
    try {
        authLogger.info('Admin signup service', {
            email: input.email
        });

        /* 🔒 Enforce ADMIN ONLY */
        if (input.role_code !== 'admin') {
            const status = 400;
            return {
                success: false,
                message: 'INVALID_ROLE',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'role_code', message: 'Only admin creation is allowed' }]
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

        /* 2️⃣ Phone uniqueness */
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

        /* 3️⃣ Hash password */
        const passwordHash = await passwordManager.hashPassword(input.password);

        /* 4️⃣ Prepare user */
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

        /* 5️⃣ Persist (NO STAFF PROFILE - Admin only in users table) */
        const result = await adminSignUpDAO({
            userData,
            role_code: 'admin',
            assigned_by: createdByUserId // Super admin's user_id
        });

        if (!result.success || !result.user) {
            const status = 500;
            return {
                success: false,
                message: 'ADMIN_CREATION_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to create admin account' }]
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
            roles: ['admin'], // Admin role
            created_at: result.user.created_at
        };

        return {
            success: true,
            message: 'ADMIN_CREATED_SUCCESSFULLY',
            status: 201,
            code: 'SUCCESS',
            data: response,
            errors: []
        };

    } catch (error) {
        authLogger.error('Admin signup error', error);
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