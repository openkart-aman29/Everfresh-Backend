import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import crypto from 'crypto';
import { ENV } from '@/configurations/ENV_Configuration';

/**
 * ============================================================================
 * FORGOT PASSWORD DAO
 * ============================================================================
 * Purpose: Database operations for password reset functionality
 * 
 * Operations:
 * 1. checkUserExistsByIdentifier - Find user by email/phone
 * 2. savePasswordResetToken - Store hashed reset token
 * 3. getPasswordResetToken - Fetch reset token for verification
 * 4. revokePasswordResetToken - Invalidate used/expired tokens
 * 5. cleanupExpiredResetTokens - Maintenance function
 * 
 * Security Features:
 * ✅ Token hashing (SHA-256) - Never store plain tokens
 * ✅ Expiration tracking (15 minutes)
 * ✅ Device/IP audit trail
 * ✅ Single-use tokens (revoked after use)
 * ✅ User status validation (active + verified)
 * ============================================================================
 */

/**
 * Interface for user data returned from database
 */
interface UserDataInterface {
    user_id: string;
    company_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    is_active: boolean;
    email_verified: boolean;
}

/**
 * Interface for reset token data
 */
interface PasswordResetTokenInterface {
    user_id: string;
    reset_token_hash: string;
    reset_token_expiry: Date;
    device_info?: string;
    ip_address?: string;
}

/**
 * Interface for saving reset token
 */
interface SavePasswordResetTokenInput {
    user_id: string;
    reset_token: string;  // Plain JWT token (will be hashed)
    device_info?: string;
    ip_address?: string;
}

class ForgotPasswordDAO extends BaseAuthDAO {

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * CHECK IF USER EXISTS BY EMAIL OR PHONE
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Finds user by email OR phone number
     * 
     * Filters:
     * - User must be ACTIVE (is_active = true)
     * - User must have verified email (email_verified = true)
     * - User must not be soft-deleted (deleted_at IS NULL)
     * 
     * Security: Returns null if user doesn't meet criteria
     * This prevents enumeration attacks - service layer returns success anyway
     * 
     * @param identifier - Email or phone number
     * @returns User object or null if not found/not eligible
     */
    async checkUserExistsByIdentifier(
        identifier: string
    ): Promise<UserDataInterface | null> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('checkUserExistsByIdentifier', new Error('Database pool not available'));
                return null;
            }

            authLogger.info('Checking user exists by identifier @ DAO', {
                identifierPrefix: identifier.substring(0, 3) + '***'
            });

            const query = `
                SELECT
                    user_id,
                    company_id,
                    email,
                    first_name,
                    last_name,
                    phone,
                    is_active,
                    email_verified
                FROM users
                WHERE (
                    LOWER(email) = LOWER($1)
                    OR phone = $1
                )
                AND is_active = TRUE
                AND deleted_at IS NULL
                LIMIT 1
            `;

            const result = await pool.query(query, [identifier]);

            if (result.rows.length === 0) {
                authLogger.warn('User not found or not eligible @ DAO', {
                    identifierPrefix: identifier.substring(0, 3) + '***'
                });
                return null;
            }

            const user = result.rows[0];

            authLogger.info('User found and eligible @ DAO', {
                userId: user.user_id,
                email: user.email.substring(0, 3) + '***',
                isActive: user.is_active,
                emailVerified: user.email_verified
            });

            return {
                user_id: user.user_id,
                company_id: user.company_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                is_active: user.is_active,
                email_verified: user.email_verified
            };

        } catch (error) {
            this.logError('checkUserExistsByIdentifier', error);
            return null;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * SAVE PASSWORD RESET TOKEN
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Stores hashed reset token in database
     * 
     * 🔒 SECURITY FEATURES:
     * - Token is hashed using SHA-256 (never store plain JWT)
     * - Expiry time calculated (15 minutes from now)
     * - Device info and IP address saved for audit trail
     * - Revokes any existing reset tokens for user (prevents multiple tokens)
     * 
     * Database fields updated:
     * - reset_token_hash: SHA-256 hash of JWT token
     * - reset_token_expiry: Timestamp when token expires
     * - reset_token_device_info: User agent string
     * - reset_token_ip_address: Request IP address
     * 
     * @param input - User ID, plain token, device info, IP address
     * @returns true if saved successfully, false otherwise
     */
    async savePasswordResetToken(
        input: SavePasswordResetTokenInput
    ): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('savePasswordResetToken', new Error('Database pool not available'));
                return false;
            }

            authLogger.info('Saving password reset token @ DAO', {
                userId: input.user_id,
                tokenPrefix: input.reset_token.substring(0, 20) + '...'
            });

            /* ═══════════════════════════════════════════════════════════════
               STEP 1: Hash the reset token using SHA-256
               
               🔒 SECURITY: Never store plain JWT tokens in database
               Even if database is compromised, tokens cannot be used
               ═══════════════════════════════════════════════════════════ */
            
            const tokenHash = this.hashToken(input.reset_token);

            /* ═══════════════════════════════════════════════════════════════
               STEP 2: Calculate expiry time (15 minutes from now)
               
               Uses ENV.JWT_ACCESS_TOKEN_EXPIRATION which is 900 seconds (15 min)
               ═══════════════════════════════════════════════════════════ */
            
            const expiryTime = new Date();
            expiryTime.setSeconds(expiryTime.getSeconds() + ENV.JWT_ACCESS_TOKEN_EXPIRATION);

            authLogger.info('Reset token expiry calculated @ DAO', {
                userId: input.user_id,
                expiresAt: expiryTime.toISOString()
            });

            /* ═══════════════════════════════════════════════════════════════
               STEP 3: Update user record with hashed token
               
               This also revokes any existing reset tokens by overwriting them
               Only one active reset token per user at a time
               ═══════════════════════════════════════════════════════════ */
            
            const query = `
                UPDATE users
                SET 
                    reset_token_hash = $1,
                    reset_token_expiry = $2,
                    reset_token_device_info = $3,
                    reset_token_ip_address = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $5
                  AND deleted_at IS NULL
            `;

            const values = [
                tokenHash,
                expiryTime,
                input.device_info || null,
                input.ip_address || null,
                input.user_id
            ];

            const result = await pool.query(query, values);

            const success = result.rowCount !== null && result.rowCount > 0;

            if (success) {
                authLogger.info('Password reset token saved successfully @ DAO', {
                    userId: input.user_id,
                    expiresAt: expiryTime.toISOString()
                });
            } else {
                authLogger.error('Failed to save password reset token @ DAO', {
                    userId: input.user_id
                });
            }

            return success;

        } catch (error) {
            this.logError('savePasswordResetToken', error);
            return false;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * GET PASSWORD RESET TOKEN FOR VERIFICATION
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Fetches reset token data for verification during password reset
     * 
     * Used in reset password flow to verify token is valid:
     * - Token hash matches
     * - Token not expired
     * - User is still active
     * 
     * @param userId - User ID to fetch reset token for
     * @returns Reset token data or null if not found/expired
     */
    async getPasswordResetToken(
        userId: string
    ): Promise<PasswordResetTokenInterface | null> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('getPasswordResetToken', new Error('Database pool not available'));
                return null;
            }

            authLogger.info('Fetching password reset token @ DAO', {
                userId
            });

            const query = `
                SELECT
                    user_id,
                    reset_token_hash,
                    reset_token_expiry,
                    reset_token_device_info,
                    reset_token_ip_address
                FROM users
                WHERE user_id = $1
                  AND reset_token_hash IS NOT NULL
                  AND reset_token_expiry > CURRENT_TIMESTAMP
                  AND is_active = TRUE
                  AND deleted_at IS NULL
                LIMIT 1
            `;

            const result = await pool.query(query, [userId]);

            if (result.rows.length === 0) {
                authLogger.warn('Reset token not found or expired @ DAO', {
                    userId
                });
                return null;
            }

            const tokenData = result.rows[0];

            authLogger.info('Reset token fetched successfully @ DAO', {
                userId: tokenData.user_id,
                expiresAt: tokenData.reset_token_expiry
            });

            return {
                user_id: tokenData.user_id,
                reset_token_hash: tokenData.reset_token_hash,
                reset_token_expiry: new Date(tokenData.reset_token_expiry),
                device_info: tokenData.reset_token_device_info,
                ip_address: tokenData.reset_token_ip_address
            };

        } catch (error) {
            this.logError('getPasswordResetToken', error);
            return null;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * REVOKE PASSWORD RESET TOKEN
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Invalidates reset token after successful password reset or on expiry
     * 
     * Sets all reset token fields to NULL:
     * - reset_token_hash
     * - reset_token_expiry
     * - reset_token_device_info
     * - reset_token_ip_address
     * 
     * This ensures tokens are single-use only
     * 
     * @param userId - User ID whose reset token should be revoked
     * @returns true if revoked successfully, false otherwise
     */
    async revokePasswordResetToken(
        userId: string
    ): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('revokePasswordResetToken', new Error('Database pool not available'));
                return false;
            }

            authLogger.info('Revoking password reset token @ DAO', {
                userId
            });

            const query = `
                UPDATE users
                SET 
                    reset_token_hash = NULL,
                    reset_token_expiry = NULL,
                    reset_token_device_info = NULL,
                    reset_token_ip_address = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1
                  AND deleted_at IS NULL
            `;

            const result = await pool.query(query, [userId]);

            const success = result.rowCount !== null && result.rowCount > 0;

            if (success) {
                authLogger.info('Password reset token revoked successfully @ DAO', {
                    userId
                });
            } else {
                authLogger.warn('No token to revoke @ DAO', {
                    userId
                });
            }

            return success;

        } catch (error) {
            this.logError('revokePasswordResetToken', error);
            return false;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * CLEANUP EXPIRED RESET TOKENS (MAINTENANCE)
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Removes expired reset tokens from database
     * 
     * Should be run periodically (e.g., daily cron job)
     * Cleans up tokens that expired more than 1 hour ago
     * 
     * @returns Number of tokens cleaned up
     */
    async cleanupExpiredResetTokens(): Promise<number> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('cleanupExpiredResetTokens', new Error('Database pool not available'));
                return 0;
            }

            authLogger.info('Cleaning up expired reset tokens @ DAO');

            const query = `
                UPDATE users
                SET 
                    reset_token_hash = NULL,
                    reset_token_expiry = NULL,
                    reset_token_device_info = NULL,
                    reset_token_ip_address = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE reset_token_expiry < (CURRENT_TIMESTAMP - INTERVAL '1 hour')
                  AND reset_token_hash IS NOT NULL
            `;

            const result = await pool.query(query);
            const cleanedCount = result.rowCount || 0;

            authLogger.info('Expired reset tokens cleaned up @ DAO', {
                count: cleanedCount
            });

            return cleanedCount;

        } catch (error) {
            this.logError('cleanupExpiredResetTokens', error);
            return 0;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * INTERNAL HELPER: Hash Token using SHA-256
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Private method to hash JWT tokens before storage
     * Same hashing strategy as refresh tokens
     * 
     * @param token - Plain JWT token string
     * @returns SHA-256 hash (64 character hex string)
     */
    private hashToken(token: string): string {
        return crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXPORT HELPER FUNCTIONS (Functional Programming Pattern)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Check if user exists and is eligible for password reset
 * @param identifier - Email or phone number
 */
export async function checkUserExistsByIdentifier(
    identifier: string
): Promise<UserDataInterface | null> {
    const dao = new ForgotPasswordDAO();
    return dao.checkUserExistsByIdentifier(identifier);
}

/**
 * Save hashed password reset token to database
 * @param input - User ID, plain token, device info, IP address
 */
export async function savePasswordResetToken(
    input: SavePasswordResetTokenInput
): Promise<boolean> {
    const dao = new ForgotPasswordDAO();
    return dao.savePasswordResetToken(input);
}

/**
 * Get password reset token data for verification
 * @param userId - User ID to fetch reset token for
 */
export async function getPasswordResetToken(
    userId: string
): Promise<PasswordResetTokenInterface | null> {
    const dao = new ForgotPasswordDAO();
    return dao.getPasswordResetToken(userId);
}

/**
 * Revoke password reset token (single-use enforcement)
 * @param userId - User ID whose token should be revoked
 */
export async function revokePasswordResetToken(
    userId: string
): Promise<boolean> {
    const dao = new ForgotPasswordDAO();
    return dao.revokePasswordResetToken(userId);
}

/**
 * Cleanup expired reset tokens (maintenance function)
 * Run via cron job daily
 */
export async function cleanupExpiredResetTokens(): Promise<number> {
    const dao = new ForgotPasswordDAO();
    return dao.cleanupExpiredResetTokens();
}

/**
 * ============================================================================
 * USAGE EXAMPLE IN SERVICE LAYER
 * ============================================================================
 * 
 * import {
 *     checkUserExistsByIdentifier,
 *     savePasswordResetToken
 * } from '@/modules/auth/operations/forgot_password/dao/Forgot_Password_DAO';
 * 
 * // Check user exists
 * const user = await checkUserExistsByIdentifier(email);
 * 
 * // Save reset token
 * const tokenSaved = await savePasswordResetToken({
 *     user_id: user.user_id,
 *     reset_token: resetToken,
 *     device_info: deviceInfo,
 *     ip_address: ipAddress
 * });
 * 
 * ============================================================================
 */