import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import crypto from 'crypto';
import { ENV } from '@/configurations/ENV_Configuration';

interface RefreshTokenData {
    token_id: string;
    user_id: string;
    refresh_token: string;
    hashed_token: string;
    expires_at: Date;
    device_info?: string;
    ip_address?: string;
}

class TokenRotationManager {
    // Generate secure refresh token (ULID + random bytes)
    generateRefreshToken(): { token: string; hashed: string } {
        const ulid = generateULID();
        const randomBytes = crypto.randomBytes(16).toString('hex');
        const token = `${ulid}.${randomBytes}`;

        // Hash token for storage
        const hashed = this.hashToken(token);

        return { token, hashed };
    }

    // Hash token using SHA-256
    private hashToken(token: string): string {
        return crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
    }

    // Verify token matches hash
    verifyTokenHash(token: string, hashedToken: string): boolean {
        const computedHash = this.hashToken(token);
        return crypto.timingSafeEqual(
            Buffer.from(computedHash),
            Buffer.from(hashedToken)
        );
    }

    // Calculate expiration date
    calculateExpirationDate(daysFromNow: number = 7): Date {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + daysFromNow);
        return expirationDate;
    }

    // Extract device info from user agent
    extractDeviceInfo(userAgent: string | undefined): string {
        if (!userAgent) return 'unknown';

        // Simple device detection (can be enhanced)
        if (userAgent.includes('Mobile')) return 'mobile';
        if (userAgent.includes('Tablet')) return 'tablet';
        return 'desktop';
    }

    // Prepare refresh token data for storage
    prepareTokenData(
        userId: string,
        deviceInfo?: string,
        ipAddress?: string
    ): RefreshTokenData {
        const { token, hashed } = this.generateRefreshToken();
        const tokenId = generateULID();
        const expiresAt = this.calculateExpirationDate(7);

        return {
            token_id: tokenId,
            user_id: userId,
            refresh_token: token,
            hashed_token: hashed,
            expires_at: expiresAt,
            device_info: deviceInfo,
            ip_address: ipAddress
        };
    }
}

export const tokenRotationManager = new TokenRotationManager();