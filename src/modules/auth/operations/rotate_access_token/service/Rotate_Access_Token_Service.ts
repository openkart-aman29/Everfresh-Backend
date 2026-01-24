import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { jwtManager } from '@/modules/auth/manager/JWT_Manager';
import { tokenRotationManager } from '@/modules/auth/manager/Token_Rotation_Manager';
import {
    RefreshTokenResponseInterface
} from '@/modules/auth/interface/Token_Interface';
import {
    getRefreshTokenByHash,
    markRefreshTokenAsUsed,
    revokeRefreshToken,
    saveRefreshToken,
    getUserByIdWithRoles
} from '@/modules/auth/operations/rotate_access_token/dao/Rotate_Access_Token_DAO';
import crypto from 'crypto';

/**
 * ============================================================================
 * ROTATE ACCESS TOKEN SERVICE
 * ============================================================================
 * Purpose: Business logic for rotating access tokens using refresh tokens
 * 
 * Security Features:
 * ✅ Token hashing (SHA-256) - Never store plain tokens
 * ✅ Token rotation - Both access AND refresh tokens rotated
 * ✅ Expiration validation - Checks token expiry
 * ✅ Revocation checks - Ensures token not revoked
 * ✅ User status validation - Verifies user is active
 * ✅ Anti-replay protection - Revokes old token after use
 * ✅ Device/IP tracking - Audit trail for security
 * 
 * Flow:
 * 1. Hash incoming refresh token
 * 2. Fetch token record from database
 * 3. Validate token (expiration, revocation)
 * 4. Verify token hash (timing-safe comparison)
 * 5. Verify user exists and is active
 * 6. Mark old token as used
 * 7. Generate new access token
 * 8. Generate new refresh token (ROTATION)
 * 9. Save new refresh token to database
 * 10. Revoke old refresh token
 * 11. Return both new tokens
 * ============================================================================
 */

interface RotateAccessTokenInput {
    refreshToken: string;
    deviceInfo?: string;
    ipAddress?: string;
}

export const rotateAccessTokenService = async (
    input: RotateAccessTokenInput
): Promise<StandardResponseInterface<RefreshTokenResponseInterface | null>> => {
    try {
        authLogger.info('Starting access token rotation @ rotateAccessTokenService');

        const { refreshToken, deviceInfo, ipAddress } = input;

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 1: Hash incoming refresh token for database lookup
           
           🔒 SECURITY: We never store plain tokens in the database
           - Tokens are hashed using SHA-256
           - Even if database is compromised, tokens cannot be used
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const hashedToken = hashToken(refreshToken);

        if (!hashedToken) {
            const status = 401;
            authLogger.error('Failed to hash refresh token @ rotateAccessTokenService');
            return {
                success: false,
                message: 'INVALID_REFRESH_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'refreshToken', message: 'Invalid refresh token format' }]
            };
        }

        authLogger.info('Refresh token hashed successfully @ rotateAccessTokenService');

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 2: Fetch refresh token record from database
           
           Query filters:
           - Matches hashed token
           - Not revoked (revoked_at IS NULL)
           - Not expired (expires_at > NOW)
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const storedToken = await getRefreshTokenByHash(hashedToken);

        if (!storedToken) {
            const status = 401;
            authLogger.error('Refresh token not found or invalid @ rotateAccessTokenService', {
                hashedTokenPrefix: hashedToken.substring(0, 10) + '...'
            });
            return {
                success: false,
                message: 'INVALID_REFRESH_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'refreshToken',
                        message: 'Refresh token not found, expired, or revoked'
                    }
                ]
            };
        }

        authLogger.info('Refresh token found in database @ rotateAccessTokenService', {
            tokenId: storedToken.token_id,
            userId: storedToken.user_id
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 3: Additional expiration check (defense in depth)
           
           Even though database query filters expired tokens,
           we double-check here for security
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        if (storedToken.expires_at < new Date()) {
            await revokeRefreshToken(storedToken.token_id);

            const status = 401;
            authLogger.warn('Refresh token expired @ rotateAccessTokenService', {
                tokenId: storedToken.token_id,
                expiresAt: storedToken.expires_at
            });
            return {
                success: false,
                message: 'REFRESH_TOKEN_EXPIRED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'refreshToken',
                        message: 'Refresh token has expired'
                    }
                ]
            };
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 4: Verify token hash using timing-safe comparison
           
           🔒 SECURITY: Prevents timing attacks
           - Uses crypto.timingSafeEqual for constant-time comparison
           - If verification fails, revoke token immediately
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const isValidToken = tokenRotationManager.verifyTokenHash(
            refreshToken,
            storedToken.hashed_token
        );

        if (!isValidToken) {
            await revokeRefreshToken(storedToken.token_id);

            const status = 401;
            authLogger.error('Token hash verification failed @ rotateAccessTokenService', {
                tokenId: storedToken.token_id,
                userId: storedToken.user_id
            });
            return {
                success: false,
                message: 'INVALID_REFRESH_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'refreshToken',
                        message: 'Token verification failed - possible tampering detected'
                    }
                ]
            };
        }

        authLogger.info('Token hash verified successfully @ rotateAccessTokenService');

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 5: Verify user exists and is active
           
           Security checks:
           - User must exist in database
           - User must have is_active = true
           - User must not be soft-deleted
           - Fetch user roles for new token payload
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const user = await getUserByIdWithRoles(storedToken.user_id);

        if (!user) {
            await revokeRefreshToken(storedToken.token_id);

            const status = 404;
            authLogger.error('User not found @ rotateAccessTokenService', {
                userId: storedToken.user_id
            });
            return {
                success: false,
                message: 'USER_NOT_FOUND',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'user',
                        message: 'User account not found'
                    }
                ]
            };
        }

        if (!user.is_active) {
            await revokeRefreshToken(storedToken.token_id);

            const status = 403;
            authLogger.warn('User account is not active @ rotateAccessTokenService', {
                userId: storedToken.user_id,
                isActive: user.is_active
            });
            return {
                success: false,
                message: 'ACCOUNT_NOT_ACTIVE',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'account',
                        message: 'Your account is not active. Please contact support.'
                    }
                ]
            };
        }

        authLogger.info('User verified and active @ rotateAccessTokenService', {
            userId: user.user_id,
            email: user.email,
            roles: user.roles
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 6: Mark old refresh token as used (anti-replay protection)
           
           This creates an audit trail of when tokens were used
           Helps detect suspicious activity patterns
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        await markRefreshTokenAsUsed(storedToken.token_id);
        authLogger.info('Old token marked as used @ rotateAccessTokenService', {
            tokenId: storedToken.token_id
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 7: Generate new access token (15 minutes validity)
           
           Token payload includes:
           - user_id: Unique user identifier
           - company_id: Multi-tenancy support
           - email: User email address
           - roles: Array of user roles (admin, staff, customer)
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const newAccessToken = jwtManager.createAccessToken({
            user_id: user.user_id,
            company_id: user.company_id,
            email: user.email,
            roles: user.roles.filter((role): role is string => role !== null)
        });

        authLogger.info('New access token generated @ rotateAccessTokenService', {
            userId: user.user_id
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 8: Generate new refresh token (7 days validity)
           
           🔒 IMPORTANT: We rotate the refresh token on EVERY use
           
           Why rotate refresh tokens?
           - Limits damage if token is stolen
           - Stolen token can only be used once
           - Legitimate user gets new token, attacker is blocked
           - Creates clear audit trail
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const newRefreshTokenData = tokenRotationManager.prepareTokenData(
            user.user_id,
            deviceInfo,
            ipAddress
        );

        authLogger.info('New refresh token generated @ rotateAccessTokenService', {
            tokenId: newRefreshTokenData.token_id,
            userId: user.user_id,
            expiresAt: newRefreshTokenData.expires_at
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 9: Save new refresh token to database
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
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
            authLogger.error('Failed to save new refresh token @ rotateAccessTokenService', {
                userId: user.user_id,
                tokenId: newRefreshTokenData.token_id
            });
            return {
                success: false,
                message: 'TOKEN_ROTATION_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'server',
                        message: 'Failed to save new refresh token'
                    }
                ]
            };
        }

        authLogger.info('New refresh token saved to database @ rotateAccessTokenService', {
            tokenId: newRefreshTokenData.token_id
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 10: Revoke old refresh token (complete the rotation)
           
           This ensures the old token cannot be reused
           Helps detect token theft/replay attacks
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const tokenRevoked = await revokeRefreshToken(storedToken.token_id);

        if (!tokenRevoked) {
            authLogger.warn('Failed to revoke old refresh token (non-critical) @ rotateAccessTokenService', {
                tokenId: storedToken.token_id
            });
            // Non-critical error - continue with success response
        } else {
            authLogger.info('Old refresh token revoked @ rotateAccessTokenService', {
                tokenId: storedToken.token_id
            });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 11: Return success response with both new tokens
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const status = 200;
        authLogger.info('Access token rotation successful @ rotateAccessTokenService', {
            userId: user.user_id,
            email: user.email,
            oldTokenId: storedToken.token_id,
            newTokenId: newRefreshTokenData.token_id
        });

        return {
            success: true,
            message: 'ACCESS_TOKEN_ROTATED_SUCCESSFULLY',
            status,
            code: 'SUCCESS',
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshTokenData.refresh_token
            },
            errors: []
        };

    } catch (error) {
        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CATASTROPHIC ERROR HANDLING
           
           This catch block should rarely execute if DAO layer handles errors
           Log full error details for debugging
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        authLogger.error('CRITICAL ERROR @ rotateAccessTokenService', error);

        const status = 500;
        return {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [
                {
                    field: 'server',
                    message: 'Internal server error during token rotation'
                }
            ]
        };
    }
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INTERNAL HELPER FUNCTION: Hash Token using SHA-256
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function hashToken(token: string): string {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}