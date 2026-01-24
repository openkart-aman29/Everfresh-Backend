import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { ENV } from '@/configurations/ENV_Configuration';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';

interface JWTPayload {
    user_id: string;
    company_id: string;
    email: string;
    roles: string[];
    type: 'access' | 'refresh';
}

class JWTManager {
    private privateKey: string;
    private publicKey: string;

    constructor() {
        try {
            this.privateKey = fs.readFileSync(path.resolve(ENV.JWT_PRIVATE_KEY_PATH), 'utf8');
            this.publicKey = fs.readFileSync(path.resolve(ENV.JWT_PUBLIC_KEY_PATH), 'utf8');
            authLogger.info('JWT keys loaded successfully');
        } catch (error) {
            authLogger.error('Failed to load JWT keys', error);
            throw new Error('JWT keys not found');
        }
    }

    // Create access token (short-lived, 15 minutes)
    createAccessToken(payload: Omit<JWTPayload, 'type'>): string {
        const tokenPayload: JWTPayload = {
            ...payload,
            type: 'access'
        };

        return jwt.sign(tokenPayload, this.privateKey, {
            algorithm: 'RS256',
            expiresIn: ENV.JWT_ACCESS_TOKEN_EXPIRATION, // 900 seconds (15 min)
            issuer: 'everfresh-api',
            audience: 'everfresh-client'
        });
    }

    // Verify access token
    verifyAccessToken(token: string): JWTPayload | null {
        try {
            const decoded = jwt.verify(token, this.publicKey, {
                algorithms: ['RS256'],
                issuer: 'everfresh-api',
                audience: 'everfresh-client'
            }) as JWTPayload;

            if (decoded.type !== 'access') {
                authLogger.warn('Invalid token type', { type: decoded.type });
                return null;
            }

            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                authLogger.warn('Token expired');
            } else if (error instanceof jwt.JsonWebTokenError) {
                authLogger.error('Invalid token', error);
            }
            return null;
        }
    }

    // Decode token without verification (for debugging)
    decodeToken(token: string): JWTPayload | null {
        try {
            return jwt.decode(token) as JWTPayload;
        } catch (error) {
            authLogger.error('Failed to decode token', error);
            return null;
        }
    }

    // Extract token from Authorization header
    extractTokenFromHeader(authHeader: string | undefined): string | null {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
}

export const jwtManager = new JWTManager();