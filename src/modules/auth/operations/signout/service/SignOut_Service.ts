import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { tokenRotationManager } from '@/modules/auth/manager/Token_Rotation_Manager';
import { revokeRefreshToken } from '@/modules/auth/operations/signout/dao/SignOut_DAO';

export const signOutService = async (
   refreshToken: string
): Promise<StandardResponseInterface<null>> => {
    try {
        authLogger.info("Signing out user - signOutService", { refreshToken: refreshToken.substring(0, 10) + '...' });

        // 1. Hash the token to match database
        const hashedToken = tokenRotationManager['hashToken'](refreshToken);

        // 2. Revoke the refresh token
        const revoked = await revokeRefreshToken(hashedToken);

        if (!revoked) {
            const status = 404;
            return {
                success: false,
                message: 'TOKEN_NOT_FOUND',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'refreshToken', message: 'Invalid or expired token' }]
            };
        }

        const status = 200;
        return {
            success: true,
            message: 'SIGNOUT_SUCCESSFUL',
            status,
            code: "SUCCESS",
            data: null,
            errors: []
        };

    } catch (error) {
        authLogger.error('Error in signout service', error);
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