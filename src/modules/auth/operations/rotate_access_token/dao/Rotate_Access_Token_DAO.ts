import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { RefreshTokenInterface, RefreshTokenDBInterface } from '@/modules/auth/interface/Token_Interface';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';

/**
 * ============================================================================
 * ROTATE ACCESS TOKEN DAO
 * ============================================================================
 * Purpose: Database operations for access token rotation
 * 
 * Operations:
 * 1. getRefreshTokenByHash - Fetch active token by hashed value
 * 2. markRefreshTokenAsUsed - Update last_used_at timestamp
 * 3. revokeRefreshToken - Mark token as revoked (soft delete)
 * 4. saveRefreshToken - Insert new refresh token
 * 5. getUserByIdWithRoles - Fetch user data with role information
 * 
 * Security Features:
 * ✅ Only fetches non-revoked tokens (revoked_at IS NULL)
 * ✅ Only fetches non-expired tokens (expires_at > NOW)
 * ✅ Uses parameterized queries (SQL injection prevention)
 * ✅ Comprehensive error logging
 * ✅ Null safety checks
 * ============================================================================
 */

class RotateAccessTokenDAO extends BaseAuthDAO {

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * FETCH ACTIVE REFRESH TOKEN BY HASHED VALUE
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Filters:
     * - Matches hashed_token exactly
     * - revoked_at IS NULL (not revoked)
     * - expires_at > CURRENT_TIMESTAMP (not expired)
     * 
     * @param hashedToken - SHA-256 hashed refresh token
     * @returns RefreshTokenInterface with user roles/email, or null if not found
     */
    async getRefreshTokenByHash(
        hashedToken: string
    ): Promise<RefreshTokenInterface | null> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('getRefreshTokenByHash', new Error('Database pool not available'));
                return null;
            }

            authLogger.info('Fetching refresh token by hash @ DAO', {
                hashedTokenPrefix: hashedToken.substring(0, 10) + '...'
            });

            const query = `
                SELECT
                    rt.token_id,
                    rt.user_id,
                    rt.hashed_token,
                    rt.expires_at,
                    rt.device_info,
                    rt.ip_address,
                    rt.last_used_at,
                    rt.revoked_at,
                    rt.created_at,
                    u.email,
                    u.company_id,
                    ARRAY_AGG(DISTINCT r.role_code) FILTER (WHERE r.role_code IS NOT NULL) AS roles
                FROM refresh_tokens rt
                INNER JOIN users u ON rt.user_id = u.user_id
                LEFT JOIN user_roles ur ON u.user_id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.role_id
                WHERE rt.hashed_token = $1
                  AND rt.revoked_at IS NULL
                  AND rt.expires_at > CURRENT_TIMESTAMP
                  AND u.deleted_at IS NULL
                GROUP BY 
                    rt.token_id,
                    rt.user_id,
                    rt.hashed_token,
                    rt.expires_at,
                    rt.device_info,
                    rt.ip_address,
                    rt.last_used_at,
                    rt.revoked_at,
                    rt.created_at,
                    u.email,
                    u.company_id
                LIMIT 1
            `;

            const result = await pool.query(query, [hashedToken]);

            if (result.rows.length === 0) {
                authLogger.warn('Refresh token not found @ DAO', {
                    hashedTokenPrefix: hashedToken.substring(0, 10) + '...'
                });
                return null;
            }

            const tokenData = result.rows[0];

            authLogger.info('Refresh token fetched successfully @ DAO', {
                tokenId: tokenData.token_id,
                userId: tokenData.user_id
            });

            return {
                token_id: tokenData.token_id,
                user_id: tokenData.user_id,
                hashed_token: tokenData.hashed_token,
                expires_at: new Date(tokenData.expires_at),
                device_info: tokenData.device_info,
                ip_address: tokenData.ip_address,
                last_used_at: tokenData.last_used_at ? new Date(tokenData.last_used_at) : undefined,
                revoked_at: tokenData.revoked_at ? new Date(tokenData.revoked_at) : undefined,
                created_at: new Date(tokenData.created_at),
                email: tokenData.email,
                company_id: tokenData.company_id,
                roles: tokenData.roles || []
            };

        } catch (error) {
            this.logError('getRefreshTokenByHash', error);
            return null;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * MARK REFRESH TOKEN AS USED (ANTI-REPLAY PROTECTION)
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Updates last_used_at to current timestamp
     * Creates audit trail for token usage
     * 
     * @param tokenId - Unique token identifier (ULID)
     * @returns true if updated successfully, false otherwise
     */
    async markRefreshTokenAsUsed(
        tokenId: string
    ): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('markRefreshTokenAsUsed', new Error('Database pool not available'));
                return false;
            }

            authLogger.info('Marking refresh token as used @ DAO', { tokenId });

            const query = `
                UPDATE refresh_tokens
                SET last_used_at = CURRENT_TIMESTAMP
                WHERE token_id = $1
                  AND revoked_at IS NULL
            `;

            const result = await pool.query(query, [tokenId]);

            const success = result.rowCount !== null && result.rowCount > 0;

            if (success) {
                authLogger.info('Refresh token marked as used @ DAO', { tokenId });
            } else {
                authLogger.warn('Failed to mark token as used (may be revoked) @ DAO', { tokenId });
            }

            return success;

        } catch (error) {
            this.logError('markRefreshTokenAsUsed', error);
            return false;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * REVOKE REFRESH TOKEN (SOFT DELETE)
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Sets revoked_at to current timestamp
     * Token becomes unusable for future rotations
     * 
     * @param tokenId - Unique token identifier (ULID)
     * @returns true if revoked successfully, false otherwise
     */
    async revokeRefreshToken(
        tokenId: string
    ): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('revokeRefreshToken', new Error('Database pool not available'));
                return false;
            }

            authLogger.info('Revoking refresh token @ DAO', { tokenId });

            const query = `
                UPDATE refresh_tokens
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE token_id = $1
                  AND revoked_at IS NULL
            `;

            const result = await pool.query(query, [tokenId]);

            const success = result.rowCount !== null && result.rowCount > 0;

            if (success) {
                authLogger.info('Refresh token revoked successfully @ DAO', { tokenId });
            } else {
                authLogger.warn('Failed to revoke token (may already be revoked) @ DAO', { tokenId });
            }

            return success;

        } catch (error) {
            this.logError('revokeRefreshToken', error);
            return false;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * SAVE NEW REFRESH TOKEN TO DATABASE
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Inserts new token record with:
     * - Unique token_id (ULID)
     * - Hashed token (SHA-256)
     * - Expiration date (7 days from now)
     * - Optional device info and IP address
     * 
     * @param token - Token data to save
     * @returns true if saved successfully, false otherwise
     */
    async saveRefreshToken(
        token: Omit<
            RefreshTokenDBInterface,
            'last_used_at' | 'revoked_at' | 'created_at'
        >
    ): Promise<boolean> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('saveRefreshToken', new Error('Database pool not available'));
                return false;
            }

            authLogger.info('Saving new refresh token @ DAO', {
                tokenId: token.token_id,
                userId: token.user_id
            });

            const query = `
                INSERT INTO refresh_tokens (
                    token_id,
                    user_id,
                    hashed_token,
                    expires_at,
                    device_info,
                    ip_address
                )
                VALUES ($1, $2, $3, $4, $5, $6)
            `;

            const values = [
                token.token_id,
                token.user_id,
                token.hashed_token,
                token.expires_at,
                token.device_info || null,
                token.ip_address || null
            ];

            await pool.query(query, values);

            authLogger.info('Refresh token saved successfully @ DAO', {
                tokenId: token.token_id,
                userId: token.user_id,
                expiresAt: token.expires_at
            });

            return true;

        } catch (error) {
            this.logError('saveRefreshToken', error);
            return false;
        }
    }

    /**
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * GET USER BY ID WITH ROLES
     * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * 
     * Fetches user data including:
     * - Basic user info (email, name, etc.)
     * - Account status (is_active)
     * - User roles (admin, staff, customer)
     * - Company ID (multi-tenancy)
     * 
     * Filters:
     * - User must not be soft-deleted (deleted_at IS NULL)
     * 
     * @param userId - Unique user identifier (ULID)
     * @returns User object with roles array, or null if not found
     */
    async getUserByIdWithRoles(
        userId: string
    ): Promise<{
        user_id: string;
        company_id: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        is_active: boolean;
        email_verified: boolean;
        roles: (string | null)[];
    } | null> {
        try {
            const pool = this.getPool();
            if (!pool) {
                this.logError('getUserByIdWithRoles', new Error('Database pool not available'));
                return null;
            }

            authLogger.info('Fetching user by ID with roles @ DAO', { userId });

            const query = `
                SELECT 
                    u.user_id,
                    u.company_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.is_active,
                    u.email_verified,
                    ARRAY_AGG(DISTINCT r.role_code) FILTER (WHERE r.role_code IS NOT NULL) AS roles
                FROM users u
                LEFT JOIN user_roles ur ON u.user_id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.role_id
                WHERE u.user_id = $1
                  AND u.deleted_at IS NULL
                GROUP BY 
                    u.user_id,
                    u.company_id,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.is_active,
                    u.email_verified
                LIMIT 1
            `;

            const result = await pool.query(query, [userId]);

            if (result.rows.length === 0) {
                authLogger.warn('User not found @ DAO', { userId });
                return null;
            }

            const user = result.rows[0];

            authLogger.info('User fetched successfully @ DAO', {
                userId: user.user_id,
                email: user.email,
                isActive: user.is_active,
                roles: user.roles
            });

            return {
                user_id: user.user_id,
                company_id: user.company_id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                is_active: user.is_active,
                email_verified: user.email_verified,
                roles: user.roles || []
            };

        } catch (error) {
            this.logError('getUserByIdWithRoles', error);
            return null;
        }
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXPORT HELPER FUNCTIONS (Functional Programming Pattern)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Fetch active refresh token by hashed value
 * @param hashedToken - SHA-256 hashed refresh token
 */
export async function getRefreshTokenByHash(
    hashedToken: string
): Promise<RefreshTokenInterface | null> {
    const dao = new RotateAccessTokenDAO();
    return dao.getRefreshTokenByHash(hashedToken);
}

/**
 * Mark refresh token as used (updates last_used_at)
 * @param tokenId - Unique token identifier
 */
export async function markRefreshTokenAsUsed(
    tokenId: string
): Promise<boolean> {
    const dao = new RotateAccessTokenDAO();
    return dao.markRefreshTokenAsUsed(tokenId);
}

/**
 * Revoke refresh token permanently (sets revoked_at)
 * @param tokenId - Unique token identifier
 */
export async function revokeRefreshToken(
    tokenId: string
): Promise<boolean> {
    const dao = new RotateAccessTokenDAO();
    return dao.revokeRefreshToken(tokenId);
}

/**
 * Save newly rotated refresh token to database
 * @param token - Token data without last_used_at, revoked_at, created_at
 */
export async function saveRefreshToken(
    token: Omit<
        RefreshTokenDBInterface,
        'last_used_at' | 'revoked_at' | 'created_at'
    >
): Promise<boolean> {
    const dao = new RotateAccessTokenDAO();
    return dao.saveRefreshToken(token);
}

/**
 * Get user by ID with role information
 * @param userId - Unique user identifier
 */
export async function getUserByIdWithRoles(
    userId: string
): Promise<{
    user_id: string;
    company_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    is_active: boolean;
    email_verified: boolean;
    roles: (string | null)[];
} | null> {
    const dao = new RotateAccessTokenDAO();
    return dao.getUserByIdWithRoles(userId);
}