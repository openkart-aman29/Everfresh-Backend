import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { jwtManager } from '@/modules/auth/manager/JWT_Manager';
import {
    getPasswordResetToken,
    revokePasswordResetToken
} from '@/modules/auth/operations/forgot_password/dao/Forgot_Password_Dao';
import { resetPasswordDAO } from '@/modules/auth/operations/reset_password/dao/Reset_Password_Dao';
import EmailBrevoService from '@/utilities/email/services/Email_Brevo_Service';
import { renderTemplate } from '@/utilities/email/utitlity/Template_Utility';
import crypto from 'crypto';

/**
 * ============================================================================
 * RESET PASSWORD SERVICE
 * ============================================================================
 * Purpose: Business logic for password reset with token verification
 * 
 * Flow:
 * 1. Verify JWT token signature and decode payload
 * 2. Extract user_id from token
 * 3. Hash the provided JWT token using SHA-256
 * 4. Fetch stored token hash from database
 * 5. Compare provided token hash with stored hash
 * 6. Verify token hasn't expired in database
 * 7. Call DAO to update password with bcrypt hash
 * 8. Revoke reset token (single-use enforcement)
 * 9. Send password changed confirmation email
 * 10. Return success response
 * 
 * Security Features:
 * ✅ JWT signature verification (RS256)
 * ✅ Token hash comparison (SHA-256)
 * ✅ Double expiry check (JWT + Database)
 * ✅ User status validation (must be active)
 * ✅ Single-use tokens (revoked after use)
 * ✅ Password hashing in DAO (bcrypt)
 * ✅ Audit trail with device/IP logging
 * ✅ Confirmation email notification
 * 
 * ============================================================================
 */

/**
 * Interface for reset password service input
 */
interface ResetPasswordServiceInput {
    resetToken: string;      // JWT token from email link
    newPassword: string;     // New password (plain text, will be hashed)
    confirmPassword: string; // Must match newPassword
    deviceInfo?: string;     // User agent for audit
    ipAddress?: string;      // IP address for audit
}

/**
 * Interface for JWT token payload
 */
interface ResetTokenPayload {
    user_id: string;
    company_id: string;
    email: string;
    roles?: string[];
    iat?: number;
    exp?: number;
}

/**
 * Reset Password Service
 * Orchestrates the entire password reset flow with comprehensive validation
 */
export const resetPasswordService = async (
    input: ResetPasswordServiceInput
): Promise<StandardResponseInterface<null>> => {
    try {
        authLogger.info('Starting reset password process @ resetPasswordService');

        const { resetToken, newPassword, confirmPassword, deviceInfo, ipAddress } = input;

        /* ═══════════════════════════════════════════════════════════════════
           STEP 1: Verify JWT token signature and decode payload
           
           🔒 SECURITY CHECKS:
           - Token signature must be valid (RS256 algorithm)
           - Token must not be expired (15 minutes)
           - Token must have valid format
           
           Possible failures:
           - Invalid signature → Token tampered with
           - Expired token → User took too long
           - Malformed token → Invalid format
           ═══════════════════════════════════════════════════════════════════ */

        let tokenPayload: ResetTokenPayload;

        try {
            authLogger.info('Verifying JWT token @ resetPasswordService');

            tokenPayload = jwtManager.verifyAccessToken(resetToken) as ResetTokenPayload;

            if (!tokenPayload) {
                authLogger.error('JWT verification returned null @ resetPasswordService');

                const status = 401;
                return {
                    success: false,
                    message: 'INVALID_RESET_TOKEN',
                    status,
                    code: getErrorStatus(status),
                    data: null,
                    errors: [
                        {
                            field: 'resetToken',
                            message: 'Invalid or expired reset token. Please request a new password reset.'
                        }
                    ]
                };
            }

            authLogger.info('JWT token verified successfully @ resetPasswordService', {
                userId: tokenPayload.user_id,
                email: tokenPayload.email?.substring(0, 3) + '***'
            });

        } catch (tokenError) {
            /* JWT verification failed - token invalid, expired, or malformed */
            authLogger.error('JWT token verification failed @ resetPasswordService', {
                error: (tokenError as any)?.message || 'Unknown error'
            });

            const status = 401;
            return {
                success: false,
                message: 'INVALID_RESET_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'resetToken',
                        message: 'Invalid or expired reset token. Please request a new password reset.'
                    }
                ]
            };
        }

        /* ═══════════════════════════════════════════════════════════════════
           STEP 2: Extract and validate user_id from token payload
           
           JWT payload structure:
           {
             user_id: "01JHZX7Z3Y9E5M2K8R9C0QXABC",
             company_id: "01JGXXX1000",
             email: "user@example.com",
             roles: ["password_reset"],
             iat: 1234567890,
             exp: 1234568790
           }
           ═══════════════════════════════════════════════════════════════════ */

        const userId = tokenPayload.user_id;

        if (!userId) {
            authLogger.error('Missing user_id in token payload @ resetPasswordService');

            const status = 401;
            return {
                success: false,
                message: 'INVALID_RESET_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'resetToken',
                        message: 'Reset token is missing required information'
                    }
                ]
            };
        }

        authLogger.info('User ID extracted from token @ resetPasswordService', {
            userId
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 3: Hash the provided JWT token using SHA-256
           
           🔒 SECURITY: We store token hashes in database, not plain tokens
           - If database is compromised, tokens cannot be used
           - We hash the token here to compare with stored hash
           - Same hashing algorithm used in forgot password flow
           ═══════════════════════════════════════════════════════════════════ */

        const providedTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        authLogger.info('Reset token hashed for verification @ resetPasswordService', {
            userId,
            hashLength: providedTokenHash.length
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 4: Fetch stored reset token data from database
           
           Retrieves:
           - reset_token_hash: SHA-256 hash stored in database
           - reset_token_expiry: Expiration timestamp
           - device_info: Original request device
           - ip_address: Original request IP
           
           This query also validates:
           - Token exists (reset_token_hash IS NOT NULL)
           - Token not expired (reset_token_expiry > CURRENT_TIMESTAMP)
           - User is active (is_active = TRUE)
           - User not deleted (deleted_at IS NULL)
           ═══════════════════════════════════════════════════════════════════ */

        const storedTokenData = await getPasswordResetToken(userId);

        if (!storedTokenData) {
            authLogger.warn('Reset token not found or expired in database @ resetPasswordService', {
                userId
            });

            const status = 401;
            return {
                success: false,
                message: 'RESET_TOKEN_EXPIRED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'resetToken',
                        message: 'Reset token has expired or does not exist. Please request a new password reset.'
                    }
                ]
            };
        }

        authLogger.info('Stored token data retrieved from database @ resetPasswordService', {
            userId,
            expiresAt: storedTokenData.reset_token_expiry.toISOString()
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 5: Compare provided token hash with stored token hash
           
           🔒 SECURITY: Critical validation step
           - Ensures the token provided matches the one we generated
           - Prevents unauthorized password resets
           - Uses constant-time comparison (crypto.timingSafeEqual)
           ═══════════════════════════════════════════════════════════════════ */

        const storedTokenHash = storedTokenData.reset_token_hash;

        // Convert hex strings to buffers for timing-safe comparison
        const providedBuffer = Buffer.from(providedTokenHash, 'hex');
        const storedBuffer = Buffer.from(storedTokenHash, 'hex');

        let tokenHashesMatch = false;
        try {
            tokenHashesMatch = crypto.timingSafeEqual(providedBuffer, storedBuffer);
        } catch (error) {
            // Length mismatch or other error
            tokenHashesMatch = false;
            authLogger.warn('Token hash comparison failed @ resetPasswordService', {
                userId,
                error: (error as any)?.message
            });
        }

        if (!tokenHashesMatch) {
            authLogger.error('Token hash mismatch @ resetPasswordService', {
                userId,
                providedHashPrefix: providedTokenHash.substring(0, 10) + '...',
                storedHashPrefix: storedTokenHash.substring(0, 10) + '...'
            });

            const status = 401;
            return {
                success: false,
                message: 'INVALID_RESET_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'resetToken',
                        message: 'Invalid reset token. Please request a new password reset.'
                    }
                ]
            };
        }

        authLogger.info('Token hash validated successfully @ resetPasswordService', {
            userId
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 6: Verify passwords match (defense in depth)
           
           This should already be validated by Zod schema, but we check again
           as an additional security layer
           ═══════════════════════════════════════════════════════════════════ */

        if (newPassword !== confirmPassword) {
            authLogger.error('Password mismatch @ resetPasswordService', {
                userId
            });

            const status = 400;
            return {
                success: false,
                message: 'PASSWORD_MISMATCH',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'confirmPassword',
                        message: 'Passwords do not match'
                    }
                ]
            };
        }

        /* ═══════════════════════════════════════════════════════════════════
           STEP 7: Update password in database via DAO
           
           DAO responsibilities:
           1. Fetch user record from database
           2. Validate user is active
           3. Hash new password using bcrypt
           4. Update password_hash in users table
           5. Return user email and name for confirmation email
           ═══════════════════════════════════════════════════════════════════ */

        authLogger.info('Calling DAO to update password @ resetPasswordService', {
            userId
        });

        const resetResult = await resetPasswordDAO({
            userId,
            newPassword,
            deviceInfo,
            ipAddress
        });

        if (!resetResult.success) {
            authLogger.error('DAO failed to update password @ resetPasswordService', {
                userId,
                message: resetResult.message
            });

            const status = resetResult.status || 500;
            return {
                success: false,
                message: resetResult.message || 'FAILED_TO_RESET_PASSWORD',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: resetResult.errors || [
                    {
                        field: 'password',
                        message: 'Failed to reset password'
                    }
                ]
            };
        }

        authLogger.info('Password updated successfully in database @ resetPasswordService', {
            userId,
            userEmail: resetResult.userEmail?.substring(0, 3) + '***'
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 8: Revoke reset token (single-use enforcement)
           
           🔒 SECURITY: Prevent token reuse
           - Sets reset_token_hash to NULL
           - Sets reset_token_expiry to NULL
           - Clears device_info and ip_address
           - Token can never be used again
           
           Even if revoking fails, password has been changed successfully
           ═══════════════════════════════════════════════════════════════════ */

        authLogger.info('Revoking reset token @ resetPasswordService', {
            userId
        });

        const tokenRevoked = await revokePasswordResetToken(userId);

        if (!tokenRevoked) {
            authLogger.warn('Failed to revoke reset token @ resetPasswordService', {
                userId,
                warning: 'Password changed but token not revoked'
            });
            // Don't fail the operation - password was successfully changed
        } else {
            authLogger.info('Reset token revoked successfully @ resetPasswordService', {
                userId
            });
        }

        /* ═══════════════════════════════════════════════════════════════════
           STEP 9: Send password changed confirmation email
           
           Email includes:
           - User's name
           - Change timestamp
           - Device info and IP address
           - Security warning about unauthorized changes
           - Link to report suspicious activity
           
           If email fails, we don't fail the entire operation
           Password has been changed successfully
           ═══════════════════════════════════════════════════════════════════ */

        if (resetResult.userEmail && resetResult.userName) {
            try {
                authLogger.info('Sending password changed confirmation email @ resetPasswordService', {
                    userId,
                    userEmail: resetResult.userEmail.substring(0, 3) + '***'
                });

                const currentDate = new Date();
                const changeDate = currentDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const changeTime = currentDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                });

                const html = await renderTemplate('password-changed', {
                    userName: resetResult.userName,
                    userEmail: resetResult.userEmail,
                    changeDate: changeDate,
                    changeTime: changeTime,
                    deviceInfo: deviceInfo || 'Not available',
                    ipAddress: ipAddress || 'Not available'
                });

                await EmailBrevoService.sendEmail({
                    to: resetResult.userEmail,
                    subject: 'Password Changed Successfully - Everfresh',
                    html
                });

                authLogger.info('Password changed confirmation email sent successfully @ resetPasswordService', {
                    userId,
                    userEmail: resetResult.userEmail.substring(0, 3) + '***'
                });

            } catch (emailError) {
                /* Email failure should not fail the entire operation */
                authLogger.error('Failed to send password changed confirmation email @ resetPasswordService', {
                    userId,
                    userEmail: resetResult.userEmail?.substring(0, 3) + '***',
                    error: (emailError as any)?.message || 'Unknown error'
                });
                // Don't return error - password was changed successfully
            }
        }

        /* ═══════════════════════════════════════════════════════════════════
           STEP 10: Return success response
           
           User can now login with new password
           Old reset link is invalid and cannot be reused
           ═══════════════════════════════════════════════════════════════════ */

        const status = 200;
        authLogger.info('Password reset completed successfully @ resetPasswordService', {
            userId,
            ipAddress
        });

        return {
            success: true,
            message: 'PASSWORD_RESET_SUCCESSFULLY',
            status,
            code: 'SUCCESS',
            data: null,
            errors: []
        };

    } catch (error) {
        /* ═══════════════════════════════════════════════════════════════════
           CATASTROPHIC ERROR HANDLING
           
           This should rarely happen if all layers handle errors properly
           Log full error details for debugging
           ═══════════════════════════════════════════════════════════════════ */

        authLogger.error('CRITICAL ERROR @ resetPasswordService', error);

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
                    message: 'Internal server error occurred during password reset'
                }
            ]
        };
    }
};

/**
 * ============================================================================
 * SECURITY VALIDATION SUMMARY
 * ============================================================================
 * 
 * This service implements a multi-layer security validation approach:
 * 
 * Layer 1: JWT Signature Verification
 * - Validates token was signed by our private key
 * - Checks token hasn't expired (15 minutes)
 * - Prevents token tampering
 * 
 * Layer 2: Database Token Hash Comparison
 * - Verifies token hash matches stored hash
 * - Uses timing-safe comparison (prevents timing attacks)
 * - Ensures token was actually generated by our system
 * 
 * Layer 3: Database Expiry Check
 * - Double-checks token hasn't expired in database
 * - Provides additional security layer
 * - Handles clock skew issues
 * 
 * Layer 4: User Status Validation (in DAO)
 * - Ensures user is still active
 * - Checks user hasn't been deleted
 * - Validates user can authenticate
 * 
 * Layer 5: Token Revocation
 * - Makes token single-use only
 * - Prevents replay attacks
 * - Clears all reset token data
 * 
 * ============================================================================
 * USAGE EXAMPLE
 * ============================================================================
 * 
 * import { resetPasswordService } from '@/modules/auth/operations/reset_password/service/Reset_Password_Service';
 * 
 * const result = await resetPasswordService({
 *     resetToken: "eyJhbGciOiJSUzI1NiIs...",
 *     newPassword: "SecureP@ssw0rd123",
 *     confirmPassword: "SecureP@ssw0rd123",
 *     deviceInfo: "Mozilla/5.0...",
 *     ipAddress: "192.168.1.100"
 * });
 * 
 * if (result.success) {
 *     // Password reset successful
 *     // User can now login with new password
 * } else {
 *     // Handle error based on result.message
 * }
 * 
 * ============================================================================
 */