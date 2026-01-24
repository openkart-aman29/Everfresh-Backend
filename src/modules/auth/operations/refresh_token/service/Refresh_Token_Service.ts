import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { jwtManager } from '@/modules/auth/manager/JWT_Manager';
import { tokenRotationManager } from '@/modules/auth/manager/Token_Rotation_Manager';
import { getRefreshTokenByHash, updateTokenLastUsed } from '@/modules/auth/operations/refresh_token/dao/Refresh_Token_DAO';
import { revokeRefreshToken } from '@/modules/auth/operations/signout/dao/SignOut_DAO';
import { saveRefreshToken } from '@/modules/auth/operations/signin/dao/Save_Refresh_Token_DAO';
import { getUserById } from '@/modules/auth/operations/signin/dao/SignIn_DAO';
import { RefreshTokenRequestInterface, RefreshTokenResponseInterface } from '@/modules/auth/interface/Token_Interface';

export const refreshTokenService = async (
    input: RefreshTokenRequestInterface,
    deviceInfo?: string,
    ipAddress?: string
): Promise<StandardResponseInterface<RefreshTokenResponseInterface | null>> => {
    try {
        authLogger.info('Refresh token service');

        // 1. Hash the provided token
        const hashedToken = tokenRotationManager['hashToken'](input.refreshToken);

        // 2. Get token from database
        const existingToken = await getRefreshTokenByHash(hashedToken);

        if (!existingToken) {
            const status = 401;
            return {
                success: false,
                message: 'INVALID_REFRESH_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'refreshToken', message: 'Invalid or expired refresh token' }]
            };
        }

        // 3. Get user details (to generate new access token)
        const user = await getUserById(existingToken.user_id);

        if (!user) {
            const status = 401;
            return {
                success: false,
                message: 'USER_NOT_FOUND',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'user', message: 'User not found' }]
            };
        }

        // 4. Revoke old refresh token
        await revokeRefreshToken(hashedToken);

        // 5. Generate new tokens
        const newRefreshTokenData = tokenRotationManager.prepareTokenData(
            existingToken.user_id,
            deviceInfo || existingToken.device_info,
            ipAddress || existingToken.ip_address
        );

        // Save new refresh token
        const tokenSaved = await saveRefreshToken({
            token_id: newRefreshTokenData.token_id,
            user_id: newRefreshTokenData.user_id,
            hashed_token: newRefreshTokenData.hashed_token,
            expires_at: newRefreshTokenData.expires_at,
            device_info: newRefreshTokenData.device_info,
            ip_address: newRefreshTokenData.ip_address
        });

        if (!tokenSaved) {
            const status = 500;
            return {
                success: false,
                message: 'TOKEN_ROTATION_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'server', message: 'Failed to rotate tokens' }]
            };
        }

        // 6. Generate new access token
        const newAccessToken = jwtManager.createAccessToken({
            user_id: user.user_id,
            company_id: user.company_id,
            email: user.email,
            roles: user.roles
        });

        // 7. Update last used
        await updateTokenLastUsed(newRefreshTokenData.token_id);

        // 8. Prepare response
        const response: RefreshTokenResponseInterface = {
            accessToken: newAccessToken,
            refreshToken: newRefreshTokenData.refresh_token
        };

        const status = 200;
        return {
            success: true,
            message: 'TOKEN_REFRESHED_SUCCESSFULLY',
            status,
            code: getErrorStatus(status),
            data: response,
            errors: []
        };

    } catch (error) {
        authLogger.error('Error in refresh token service', error);
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