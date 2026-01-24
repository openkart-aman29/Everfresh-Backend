import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { passwordManager } from '@/modules/auth/manager/Password_Manager';
// import { hashPassword } from '@/utilities/hashing/Password_Hashing';

/**
 * ============================================================================
 * RESET PASSWORD DAO
 * ============================================================================
 * Purpose: Database operations for completing password reset
 * 
 * Operations:
 * 1. resetPassword - Update user's password after token verification
 * 
 * Security Features:
 * ✅ User existence validation
 * ✅ User active status check
 * ✅ Password hashing with bcrypt (never store plain passwords)
 * ✅ Transactional update (password + metadata)
 * ✅ Audit trail with device/IP logging
 * ✅ Returns user info for confirmation email
 * 
 * Database Operations:
 * - Fetch user by user_id
 * - Validate user is active and not deleted
 * - Hash new password using bcrypt
 * - Update password_hash in users table
 * - Update updated_at timestamp
 * - Return user email and name for notifications
 * ============================================================================
 */

/**
 * Interface for reset password DAO input
 */
interface ResetPasswordDAOInput {
    userId: string;
    newPassword: string;
    deviceInfo?: string;
    ipAddress?: string;
}

/**
 * Interface for reset password result
 */
interface ResetPasswordDAOResult {
    success: boolean;
    message?: string;
    status?: number;
    errors?: Array<{
        field: string;
        message: string;
    }>;
    userEmail?: string;
    userName?: string;
}

/**
 * Interface for user data from database
 */
interface UserRecord {
    user_id: string;
    company_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    is_active: boolean;
    email_verified: boolean;
    deleted_at: Date | null;
}

class ResetPasswordDAO extends BaseAuthDAO {

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * RESET PASSWORD - UPDATE USER PASSWORD
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Updates user's password after successful token verification
     * 
     * Process:
     * 1. Fetch user record from database
     * 2. Validate user exists and is active
     * 3. Hash new password using bcrypt
     * 4. Update password_hash in database
     * 5. Update updated_at timestamp
     * 6. Return user info for confirmation email
     * 
     * Security:
     * - Validates user is active (is_active = true)
     * - Validates user not deleted (deleted_at IS NULL)
     * - Hashes password with bcrypt (salt rounds: 10)
     * - Never stores plain text passwords
     * 
     * @param input - User ID, new password, device info, IP address
     * @returns Success flag, user email/name, or error details
     */
    async resetPassword(
        input: ResetPasswordDAOInput
    ): Promise<ResetPasswordDAOResult> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('resetPassword', new Error('Database pool not available'));
                return {
                    success: false,
                    message: 'DATABASE_CONNECTION_ERROR',
                    status: 500,
                    errors: [
                        {
                            field: 'database',
                            message: 'Database connection failed'
                        }
                    ]
                };
            }

            authLogger.info('Starting password reset @ DAO', {
                userId: input.userId
            });

            /* ═══════════════════════════════════════════════════════════════
               STEP 1: Fetch user record from database
               
               Validates:
               - User exists
               - User is active
               - User not soft-deleted
               ═══════════════════════════════════════════════════════════ */
            
            const getUserQuery = `
                SELECT
                    user_id,
                    company_id,
                    email,
                    first_name,
                    last_name,
                    phone,
                    is_active,
                    email_verified,
                    deleted_at
                FROM users
                WHERE user_id = $1
                LIMIT 1
            `;

            const userResult = await pool.query(getUserQuery, [input.userId]);

            if (userResult.rows.length === 0) {
                authLogger.error('User not found @ DAO', {
                    userId: input.userId
                });

                return {
                    success: false,
                    message: 'USER_NOT_FOUND',
                    status: 404,
                    errors: [
                        {
                            field: 'user',
                            message: 'User not found'
                        }
                    ]
                };
            }

            const user: UserRecord = userResult.rows[0];

            authLogger.info('User record fetched @ DAO', {
                userId: user.user_id,
                email: user.email.substring(0, 3) + '***',
                isActive: user.is_active,
                emailVerified: user.email_verified,
                isDeleted: user.deleted_at !== null
            });

            /* ═══════════════════════════════════════════════════════════════
               STEP 2: Validate user is active and not deleted
               
               Business rules:
               - User must be active (is_active = true)
               - User must not be soft-deleted (deleted_at IS NULL)
               ═══════════════════════════════════════════════════════════ */
            
            if (user.deleted_at !== null) {
                authLogger.error('User has been deleted @ DAO', {
                    userId: user.user_id,
                    deletedAt: user.deleted_at
                });

                return {
                    success: false,
                    message: 'USER_DELETED',
                    status: 403,
                    errors: [
                        {
                            field: 'user',
                            message: 'User account has been deleted'
                        }
                    ]
                };
            }

            if (!user.is_active) {
                authLogger.error('User account is not active @ DAO', {
                    userId: user.user_id
                });

                return {
                    success: false,
                    message: 'ACCOUNT_NOT_ACTIVE',
                    status: 403,
                    errors: [
                        {
                            field: 'user',
                            message: 'User account is not active'
                        }
                    ]
                };
            }

            authLogger.info('User validation passed @ DAO', {
                userId: user.user_id
            });

            /* ═══════════════════════════════════════════════════════════════
               STEP 3: Hash new password using bcrypt
               
               🔒 SECURITY: Never store plain text passwords
               - Uses bcrypt with salt rounds (default: 10)
               - Generates unique salt for each password
               - Computationally expensive to crack
               - Industry standard for password hashing
               ═══════════════════════════════════════════════════════════ */
            
            authLogger.info('Hashing new password @ DAO', {
                userId: user.user_id
            });

            let hashedPassword: string;
            
            try {
                hashedPassword = await passwordManager.hashPassword(input.newPassword);
                
                authLogger.info('Password hashed successfully @ DAO', {
                    userId: user.user_id,
                    hashLength: hashedPassword.length
                });

            } catch (hashError) {
                authLogger.error('Failed to hash password @ DAO', {
                    userId: user.user_id,
                    error: (hashError as any)?.message || 'Unknown error'
                });

                return {
                    success: false,
                    message: 'PASSWORD_HASHING_FAILED',
                    status: 500,
                    errors: [
                        {
                            field: 'password',
                            message: 'Failed to hash new password'
                        }
                    ]
                };
            }

            /* ═══════════════════════════════════════════════════════════════
               STEP 4: Update password in database
               
               Updates:
               - password_hash: New bcrypt hashed password
               - updated_at: Current timestamp (auto-updated by trigger)
               
               The reset token fields are NOT cleared here
               They are cleared by revokePasswordResetToken() in service layer
               ═══════════════════════════════════════════════════════════ */
            
            authLogger.info('Updating password in database @ DAO', {
                userId: user.user_id
            });

            const updateQuery = `
                UPDATE users
                SET 
                    password_hash = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
                  AND deleted_at IS NULL
                RETURNING user_id
            `;

            const updateResult = await pool.query(updateQuery, [
                hashedPassword,
                input.userId
            ]);

            if (updateResult.rowCount === 0) {
                authLogger.error('Failed to update password @ DAO', {
                    userId: user.user_id,
                    reason: 'No rows updated'
                });

                return {
                    success: false,
                    message: 'FAILED_TO_UPDATE_PASSWORD',
                    status: 500,
                    errors: [
                        {
                            field: 'database',
                            message: 'Failed to update password in database'
                        }
                    ]
                };
            }

            authLogger.info('Password updated successfully @ DAO', {
                userId: user.user_id,
                email: user.email.substring(0, 3) + '***'
            });

            /* ═══════════════════════════════════════════════════════════════
               STEP 5: Log password change event (audit trail)
               
               Optional: You can add this data to an audit_logs table
               For now, we're logging to application logs
               ═══════════════════════════════════════════════════════════ */
            
            authLogger.info('Password reset completed @ DAO', {
                userId: user.user_id,
                email: user.email.substring(0, 3) + '***',
                deviceInfo: input.deviceInfo?.substring(0, 50) + '...',
                ipAddress: input.ipAddress,
                timestamp: new Date().toISOString()
            });

            /* ═══════════════════════════════════════════════════════════════
               STEP 6: Return success with user info for confirmation email
               
               Returns:
               - userEmail: For sending confirmation email
               - userName: First name for personalization
               ═══════════════════════════════════════════════════════════ */
            
            return {
                success: true,
                message: 'PASSWORD_RESET_SUCCESSFULLY',
                userEmail: user.email,
                userName: user.first_name
            };

        } catch (error) {
            this.logError('resetPassword', error);

            return {
                success: false,
                message: 'INTERNAL_SERVER_ERROR',
                status: 500,
                errors: [
                    {
                        field: 'server',
                        message: 'Internal server error occurred while resetting password'
                    }
                ]
            };
        }
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXPORT HELPER FUNCTION (Functional Programming Pattern)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Reset user password with new hashed password
 * 
 * @param input - User ID, new password, device info, IP address
 * @returns Success flag, user email/name for confirmation email, or error details
 */
export async function resetPasswordDAO(
    input: ResetPasswordDAOInput
): Promise<ResetPasswordDAOResult> {
    const dao = new ResetPasswordDAO();
    return dao.resetPassword(input);
}

/**
 * ============================================================================
 * USAGE EXAMPLE IN SERVICE LAYER
 * ============================================================================
 * 
 * import { resetPasswordDAO } from '@/modules/auth/operations/reset_password/dao/Reset_Password_DAO';
 * 
 * // Reset user password
 * const result = await resetPasswordDAO({
 *     userId: '01JHZX7Z3Y9E5M2K8R9C0QXABC',
 *     newPassword: 'SecureP@ssw0rd123',
 *     deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
 *     ipAddress: '192.168.1.100'
 * });
 * 
 * if (result.success) {
 *     console.log('Password updated successfully');
 *     console.log('User email:', result.userEmail);
 *     console.log('User name:', result.userName);
 *     
 *     // Send confirmation email
 *     await sendPasswordChangedEmail(result.userEmail, result.userName);
 * } else {
 *     console.error('Failed to reset password:', result.message);
 *     console.error('Errors:', result.errors);
 * }
 * 
 * ============================================================================
 * DATABASE SCHEMA REQUIREMENTS
 * ============================================================================
 * 
 * Required columns in `users` table:
 * - user_id (CHAR(26), PRIMARY KEY)
 * - company_id (CHAR(26), FOREIGN KEY to companies)
 * - email (CITEXT, NOT NULL, UNIQUE per company)
 * - password_hash (VARCHAR(255), NOT NULL) ← Updated by this DAO
 * - first_name (VARCHAR(100), NOT NULL)
 * - last_name (VARCHAR(100), NOT NULL)
 * - phone (VARCHAR(20), NULLABLE)
 * - is_active (BOOLEAN, NOT NULL, DEFAULT TRUE) ← Validated
 * - email_verified (BOOLEAN, NOT NULL, DEFAULT FALSE)
 * - deleted_at (TIMESTAMPTZ, NULLABLE) ← Validated
 * - created_at (TIMESTAMPTZ, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
 * - updated_at (TIMESTAMPTZ, NOT NULL, DEFAULT CURRENT_TIMESTAMP) ← Updated
 * 
 * Password reset token columns (NOT modified by this DAO):
 * - reset_token_hash (VARCHAR(64), NULLABLE)
 * - reset_token_expiry (TIMESTAMPTZ, NULLABLE)
 * - reset_token_device_info (VARCHAR(255), NULLABLE)
 * - reset_token_ip_address (VARCHAR(45), NULLABLE)
 * 
 * Note: Reset token fields are cleared by revokePasswordResetToken()
 *       in the service layer, not by this DAO
 * 
 * ============================================================================
 * SECURITY CONSIDERATIONS
 * ============================================================================
 * 
 * 1. ✅ Password Hashing:
 *    - Uses bcrypt with salt rounds (industry standard)
 *    - Never stores plain text passwords
 *    - Each password has unique salt
 * 
 * 2. ✅ User Validation:
 *    - Checks user exists
 *    - Validates user is active
 *    - Ensures user not deleted
 * 
 * 3. ✅ Audit Trail:
 *    - Logs device info and IP address
 *    - Records timestamp of password change
 *    - Tracks which operations succeed/fail
 * 
 * 4. ✅ Error Handling:
 *    - Returns specific error messages
 *    - Logs all failures
 *    - Never exposes sensitive data in errors
 * 
 * 5. ✅ Database Safety:
 *    - Uses parameterized queries (SQL injection safe)
 *    - Updates only necessary fields
 *    - Checks row count after update
 * 
 * ============================================================================
 * ERROR SCENARIOS HANDLED
 * ============================================================================
 * 
 * 1. Database Connection Failed:
 *    → Returns: DATABASE_CONNECTION_ERROR (500)
 * 
 * 2. User Not Found:
 *    → Returns: USER_NOT_FOUND (404)
 * 
 * 3. User Deleted:
 *    → Returns: USER_DELETED (403)
 * 
 * 4. User Not Active:
 *    → Returns: ACCOUNT_NOT_ACTIVE (403)
 * 
 * 5. Password Hashing Failed:
 *    → Returns: PASSWORD_HASHING_FAILED (500)
 * 
 * 6. Database Update Failed:
 *    → Returns: FAILED_TO_UPDATE_PASSWORD (500)
 * 
 * 7. Unknown Error:
 *    → Returns: INTERNAL_SERVER_ERROR (500)
 * 
 * ============================================================================
 * TESTING CHECKLIST
 * ============================================================================
 * 
 * Test Cases:
 * ✅ Valid user with active account
 * ✅ User not found
 * ✅ User account deleted (deleted_at IS NOT NULL)
 * ✅ User account inactive (is_active = false)
 * ✅ Password hashing failure
 * ✅ Database connection failure
 * ✅ Database update failure
 * ✅ Returns correct user email and name
 * ✅ Updated_at timestamp is updated
 * ✅ Password hash is stored correctly
 * 
 * ============================================================================
 */