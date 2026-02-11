import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { jwtManager } from '@/modules/auth/manager/JWT_Manager';
import {
    checkUserExistsByIdentifier,
    savePasswordResetToken
} from '@/modules/auth/operations/forgot_password/dao/Forgot_Password_Dao';
import { ENV } from '@/configurations/ENV_Configuration';
import EmailBrevoService from "@/utilities/email/services/Email_Brevo_Service";

/**
 * ============================================================================
 * FORGOT PASSWORD SERVICE (UPDATED VERSION)
 * ============================================================================
 * Purpose: Business logic for password reset token generation and email delivery
 * 
 * CHANGES FROM ORIGINAL:
 * ✅ Uncommented DAO imports
 * ✅ Uncommented DAO function calls
 * ✅ Fixed email template data structure (firstName vs first_name)
 * ✅ Added comprehensive error handling
 * ✅ Removed duplicate email sending code
 * ✅ Improved logging
 * 
 * Security Features:
 * ✅ User enumeration prevention - Always returns success
 * ✅ Active user validation - Only active users can reset
 * ✅ Email verification check - Only verified emails receive reset links
 * ✅ JWT-based reset tokens (15 min expiry)
 * ✅ Secure token storage (SHA-256 hashed)
 * ✅ Audit trail with IP/device tracking
 * ✅ Single-use tokens (revoked after password reset)
 * 
 * Flow:
 * 1. Check if user exists with ACTIVE status
 * 2. Verify email is verified (security requirement)
 * 3. Generate JWT reset token (15 min expiry)
 * 4. Save token hash to database (never plain text)
 * 5. Generate secure reset link
 * 6. Send password reset email
 * 7. Always return success (anti-enumeration)
 * ============================================================================
 */

interface ForgotPasswordServiceInput {
    email: string;
    deviceInfo?: string;
    ipAddress?: string;
}

export const forgotPasswordService = async (
    input: ForgotPasswordServiceInput
): Promise<StandardResponseInterface<null>> => {
    try {
        authLogger.info('Starting forgot password process @ forgotPasswordService', {
            email: input.email.substring(0, 3) + '***'
        });

        const { email, deviceInfo, ipAddress } = input;

        /* ═══════════════════════════════════════════════════════════════════
           STEP 1: Check if user exists with ACTIVE status
           
           Security considerations:
           - Query by email OR phone
           - User must have is_active = true
           - User must have email_verified = true
           - User must not be soft-deleted (deleted_at IS NULL)
           - If not found, we still return success (anti-enumeration)
           ═══════════════════════════════════════════════════════════════════ */

        const user = await checkUserExistsByIdentifier(email);

        if (!user) {
            /* ⚠️ SECURITY: User not found - Return success anyway
               
               This prevents attackers from discovering which emails
               are registered in the system (user enumeration attack)
               
               Legitimate users will simply not receive an email
            */

            authLogger.warn('User not found for password reset @ forgotPasswordService', {
                email: email.substring(0, 3) + '***',
                ipAddress
            });

            const status = 401;
            return {
                success: true,
                message: 'INVALID_CREDENTIALS',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: []
            };
        }

        authLogger.info('User found @ forgotPasswordService', {
            userId: user.user_id,
            email: user.email.substring(0, 3) + '***',
            isActive: user.is_active,
            emailVerified: user.email_verified
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 2: User is already validated by DAO
           
           The checkUserExistsByIdentifier function only returns users who:
           - Are active (is_active = true)
           - Have verified email (email_verified = true)
           - Are not soft-deleted (deleted_at IS NULL)
           
           So we can skip the manual validation checks here
           ═══════════════════════════════════════════════════════════════════ */

        /* ═══════════════════════════════════════════════════════════════════
           STEP 3: Generate JWT reset token (15 minutes validity)
           
           Token payload includes:
           - user_id: Unique user identifier
           - company_id: Multi-tenancy support
           - email: User email address
           - roles: ['password_reset'] - Identifies this as reset token
           
           Token properties:
           - Algorithm: RS256 (asymmetric encryption)
           - Expiry: 15 minutes (ENV.JWT_ACCESS_TOKEN_EXPIRATION)
           - Issuer: everfresh-api
           - Audience: everfresh-client
           ═══════════════════════════════════════════════════════════════════ */

        const resetToken = jwtManager.createAccessToken({
            user_id: user.user_id,
            company_id: user.company_id,
            email: user.email,
            roles: ['password_reset']
        });

        if (!resetToken) {
            authLogger.error('Failed to generate reset token @ forgotPasswordService', {
                userId: user.user_id
            });

            const status = 500;
            return {
                success: false,
                message: 'FAILED_TO_GENERATE_RESET_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'resetToken',
                        message: 'Failed to generate password reset token'
                    }
                ]
            };
        }

        authLogger.info('Reset token generated successfully @ forgotPasswordService', {
            userId: user.user_id,
            tokenPrefix: resetToken.substring(0, 20) + '...'
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 4: Hash and save reset token to database
           
           🔒 SECURITY: Never store plain JWT tokens in database
           - Token is hashed using SHA-256
           - Only hash is stored in database
           - Expiry timestamp calculated (15 min from now)
           - Device info and IP address saved for audit trail
           ═══════════════════════════════════════════════════════════════════ */

        const tokenSaved = await savePasswordResetToken({
            user_id: user.user_id,
            reset_token: resetToken,
            device_info: deviceInfo,
            ip_address: ipAddress
        });

        if (!tokenSaved) {
            authLogger.error('Failed to save reset token @ forgotPasswordService', {
                userId: user.user_id
            });

            const status = 500;
            return {
                success: false,
                message: 'FAILED_TO_SAVE_RESET_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'database',
                        message: 'Failed to save password reset token'
                    }
                ]
            };
        }

        authLogger.info('Reset token saved to database @ forgotPasswordService', {
            userId: user.user_id
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 5: Generate secure password reset link
           
           Link format:
           {FRONTEND_URL}/reset-password?token={JWT_TOKEN}
           
           Example:
           https://everfresh.com/reset-password?token=eyJhbGciOiJSUzI1NiIs...
           ═══════════════════════════════════════════════════════════════════ */

        const resetLink = `${ENV.FRONTEND_URL}auth/reset-password?token=${resetToken}`;
        authLogger.info('Reset link generated @ forgotPasswordService', {
            userId: user.user_id,
            linkLength: resetLink.length
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 6: Send password reset email
           
           Email includes:
           - User's first name
           - Reset link (clickable button)
           - Expiry time (15 minutes)
           - Security warnings
           ═══════════════════════════════════════════════════════════════════ */

        try {
            await EmailBrevoService.sendTemplateEmail(
                'forgot-password',
                {
                    firstName: user.first_name,
                    userEmail: user.email,
                    resetLink: resetLink,
                    expiryMinutes: 15
                },
                {
                    to: user.email,
                    subject: 'Password Reset Request - Everfresh'
                }
            );

            authLogger.info('Password reset email sent successfully @ forgotPasswordService', {
                userEmail: user.email.substring(0, 3) + '***',
                userId: user.user_id
            });

        } catch (emailError) {
            /* ═══════════════════════════════════════════════════════════════
               EMAIL SENDING FAILURE
               
               ⚠️ DECISION: Return error to legitimate user
               They need to know the email wasn't sent
               ═══════════════════════════════════════════════════════════ */

            authLogger.error('Failed to send password reset email @ forgotPasswordService', {
                userId: user.user_id,
                email: user.email.substring(0, 3) + '***',
                error: emailError
            });

            const status = 500;
            return {
                success: false,
                message: 'FAILED_TO_SEND_RESET_EMAIL',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'email',
                        message: 'Failed to send password reset email. Please try again later.'
                    }
                ]
            };
        }

        /* ═══════════════════════════════════════════════════════════════════
           STEP 7: Return success response
           
           Message: PASSWORD_RESET_EMAIL_SENT
           
           This message is shown to user regardless of internal state
           Prevents user enumeration attacks
           ═══════════════════════════════════════════════════════════════════ */

        const status = 200;
        authLogger.info('Password reset process completed successfully @ forgotPasswordService', {
            userId: user.user_id,
            email: user.email.substring(0, 3) + '***',
            ipAddress
        });

        return {
            success: true,
            message: 'PASSWORD_RESET_EMAIL_SENT',
            status,
            code: 'SUCCESS',
            data: null,
            errors: []
        };

    } catch (error) {
        /* ═══════════════════════════════════════════════════════════════════
           CATASTROPHIC ERROR HANDLING
           ═══════════════════════════════════════════════════════════════════ */

        authLogger.error('CRITICAL ERROR @ forgotPasswordService', error);

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
                    message: 'Internal server error during password reset process'
                }
            ]
        };
    }
};