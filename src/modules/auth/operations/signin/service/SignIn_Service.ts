import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { passwordManager } from '@/modules/auth/manager/Password_Manager';
import { jwtManager } from '@/modules/auth/manager/JWT_Manager';
import { tokenRotationManager } from '@/modules/auth/manager/Token_Rotation_Manager';
import { getUserByEmail, updateUserLastLogin } from '@/modules/auth/operations/signin/dao/SignIn_DAO';
import { saveRefreshToken } from '@/modules/auth/operations/rotate_access_token/dao/Rotate_Access_Token_DAO';
import { SignInInput } from '@/modules/auth/operations/signin/zod_schema/SignIn_Zod_Schema';
import { SignInResponseInterface } from '@/modules/auth/interface/Auth_Interface';

type DomainType = 'admin' | 'staff' | 'customer';

export const signInService = async (
    input: SignInInput,
    deviceInfo?: string,
    ipAddress?: string
): Promise<StandardResponseInterface<SignInResponseInterface | null>> => {
    try {

        const ROLE_PRIORITY = ['ADMIN', 'STAFF', 'CUSTOMER'] as const;

        authLogger.info('SignIn service', { email: input.email });

        // 1. Get user by email
        const user = await getUserByEmail(input.email);
        if (!user) {
            const status = 401;
            return {
                success: false,
                message: 'INVALID_CREDENTIALS',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'credentials', message: 'Invalid email or password' }]
            };
        }

        // 2. Check if user is active
        if (!user.is_active) {
            const status = 403;
            return {
                success: false,
                message: 'ACCOUNT_DISABLED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'account', message: 'Account is disabled' }]
            };
        }

        // 3. Verify password
        const isPasswordValid = await passwordManager.verifyPassword(
            user.password_hash,
            input.password
        );

        if (!isPasswordValid) {
            const status = 401;
            return {
                success: false,
                message: 'INVALID_CREDENTIALS',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'credentials', message: 'Invalid email or password' }]
            };
        }


        let domain_id: string | null = null;
        let domain_type: DomainType | null = null;

        const roles = user.roles.filter(Boolean);

        // // ADMIN or STAFF → staff table
        // if (roles.includes('admin') || roles.includes('staff')) {
        //     if (!user.staff_id) {
        //         throw new Error('Staff role assigned but staff profile not found');
        //     }
        //     domain_id = user.staff_id;
        //     domain_type = roles.includes('admin') ? 'admin' : 'staff';
        // }

        // // CUSTOMER → customer table
        // else if (roles.includes('customer')) {
        //     if (!user.customer_id) {
        //         throw new Error('Customer role assigned but customer profile not found');
        //     }
        //     domain_id = user.customer_id;
        //     domain_type = 'customer';
        // }

        // CUSTOMER validation
        if (roles.includes('customer')) {
            if (!user.customer_id) {
                const status = 401;
                return {
                    success: false,
                    message: 'INVALID_CREDENTIALS',
                    status,
                    code: getErrorStatus(status),
                    data: null,
                    errors: [{ field: 'customer_id', message: 'Customer role assigned but customer profile not found' }]
                }
            }
            domain_id = user.customer_id;
            domain_type = 'customer';
        }

        // STAFF validation
        if (roles.includes('staff')) {
            if (!user.staff_id) {
                // throw new Error('');
                const status = 401;
                return {
                    success: false,
                    message: 'INVALID_CREDENTIALS',
                    status,
                    code: getErrorStatus(status),
                    data: null,
                    errors: [{ field: 'staff_id', message: 'Staff role assigned but staff profile not found' }]
                }
            }
            domain_id = user.staff_id;
            domain_type = 'staff';
        }

        // ADMIN-only user (no profile validation)
        if (
            roles.includes('admin') &&
            !roles.includes('staff') &&
            !roles.includes('customer')
        ) {
            domain_id = null;
            domain_type = 'admin';
        }

        authLogger.info('User domain resolved', {
            user_id: user.user_id,
            domain_type,
            domain_id
        });
        authLogger.info(`User domain determined: type=${domain_type}, id=${domain_id}`);

        // 4. Generate access token
        const accessToken = jwtManager.createAccessToken({
            user_id: user.user_id,
            company_id: user.company_id,
            email: user.email,
            roles: user.roles
        });

        // 5. Generate refresh token
        const refreshTokenData = tokenRotationManager.prepareTokenData(
            user.user_id,
            deviceInfo,
            ipAddress
        );

        // 6. Save refresh token to database
        const tokenSaved = await saveRefreshToken({
            token_id: refreshTokenData.token_id,
            user_id: refreshTokenData.user_id,
            hashed_token: refreshTokenData.hashed_token,
            expires_at: refreshTokenData.expires_at,
            device_info: refreshTokenData.device_info,
            ip_address: refreshTokenData.ip_address
        });

        if (!tokenSaved) {
            const status = 500;
            return {
                success: false,
                message: 'TOKEN_CREATION_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'server', message: 'Failed to create session' }]
            };
        }

        // 7. Update last login
        await updateUserLastLogin(user.user_id);

        // 8. Prepare response
        const response: SignInResponseInterface = {
            accessToken,
            refreshToken: refreshTokenData.refresh_token,
            user: {
                user_id: user.user_id,
                company_id: user.company_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                is_active: user.is_active,
                email_verified: user.email_verified,
                roles: user.roles.filter(r => r !== null),
                domain_id,
                domain_type,

                created_at: new Date()
            }
        };

        const status = 200;
        return {
            success: true,
            message: 'SIGNIN_SUCCESSFUL',
            status,
            code: 'SUCCESS',
            data: response,
            errors: []
        };

    } catch (error) {
        authLogger.error('Error in signin service', error);
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