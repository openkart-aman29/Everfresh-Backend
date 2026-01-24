import argon2 from 'argon2';
import { ENV } from '@/configurations/ENV_Configuration';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';

class PasswordManager {
    private readonly options: argon2.Options = {
        type: argon2.argon2id,
        memoryCost: ENV.ARGON2_MEMORY_COST,
        timeCost: ENV.ARGON2_TIME_COST,
        parallelism: ENV.ARGON2_PARALLELISM,
        hashLength: 32
    };

    async hashPassword(password: string): Promise<string> {
        try {
            const hash = await argon2.hash(password, this.options);
            authLogger.debug('Password hashed successfully');
            return hash;
        } catch (error) {
            authLogger.error('Failed to hash password', error);
            throw error;
        }
    }

    async verifyPassword(hash: string, password: string): Promise<boolean> {
        try {
            const isValid = await argon2.verify(hash, password);
            authLogger.debug('Password verification completed', { valid: isValid });
            return isValid;
        } catch (error) {
            authLogger.error('Failed to verify password', error);
            return false;
        }
    }

    // Check if password needs rehashing (e.g., if settings changed)
    async needsRehash(hash: string): Promise<boolean> {
        try {
            return argon2.needsRehash(hash, this.options);
        } catch (error) {
            authLogger.error('Failed to check rehash', error);
            return false;
        }
    }

    // Validate password strength
    validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (password.length > 128) {
            errors.push('Password cannot exceed 128 characters');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export const passwordManager = new PasswordManager();