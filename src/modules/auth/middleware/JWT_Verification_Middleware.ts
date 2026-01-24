import { Request, Response, NextFunction } from 'express';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { jwtManager } from '@/modules/auth/manager/JWT_Manager';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                user_id: string;
                company_id: string;
                email: string;
                roles: string[];
            };
        }
    }
}

export const jwtVerificationMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Extract token from header
        const token = jwtManager.extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            const status = 401;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'MISSING_TOKEN',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'authorization', message: 'Access token required' }]
            };
            return sendResponse(res, response);
        }

        // Verify token
        const decoded = jwtManager.verifyAccessToken(token);

        if (!decoded) {
            const status = 401;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'INVALID_TOKEN',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'authorization', message: 'Invalid or expired token' }]
            };
            return sendResponse(res, response);
        }

        // Attach user to request
        req.user = {
            user_id: decoded.user_id,
            company_id: decoded.company_id,
            email: decoded.email,
            roles: decoded.roles
        };

        authLogger.info('Token verified', { user_id: decoded.user_id });
        next();

    } catch (error) {
        authLogger.error('JWT verification error', error);
        const status = 500;
        const response: StandardResponseInterface<null> = {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'SERVER_ERROR', message: 'Internal server error' }]
        };
        return sendResponse(res, response);
    }
};

// Optional: Middleware for optional authentication (doesn't fail if no token)
export const optionalJwtMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = jwtManager.extractTokenFromHeader(req.headers.authorization);

        if (token) {
            const decoded = jwtManager.verifyAccessToken(token);
            if (decoded) {
                req.user = {
                    user_id: decoded.user_id,
                    company_id: decoded.company_id,
                    email: decoded.email,
                    roles: decoded.roles
                };
            }
        }

        next();
    } catch (error) {
        authLogger.error('Optional JWT error', error);
        next();
    }
};