import { Request, Response, NextFunction } from 'express';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        first_name?: string;
        last_name?: string;
        roles: string[];
        permissions?: string[];
    };
}

export const roleAuthorizationMiddleware = (requiredRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            const response: StandardResponseInterface<null> = {
                success: false,
                status: 401,
                message: 'UNAUTHORIZED',
                code: 'UNAUTHORIZED',
                data: null,
                errors: [{ field: 'authorization', message: 'User not authenticated' }]
            };
            return res.status(401).json(response);
        }

        const hasRequiredRole = requiredRoles.some(role => req.user!.roles.includes(role));
        if (!hasRequiredRole) {
            const response: StandardResponseInterface<null> = {
                success: false,
                status: 403,
                message: 'FORBIDDEN',
                code: 'FORBIDDEN',
                data: null,
                errors: [{ field: 'authorization', message: 'Insufficient permissions' }]
            };
            return res.status(403).json(response);
        }

        next();
    };
};

export const permissionAuthorizationMiddleware = (requiredPermissions: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            const response: StandardResponseInterface<null> = {
                success: false,
                status: 401,
                message: 'UNAUTHORIZED',
                code: 'UNAUTHORIZED',
                data: null,
                errors: [{ field: 'authorization', message: 'User not authenticated' }]
            };
            return res.status(401).json(response);
        }

        const userPermissions = req.user!.permissions || [];
        const hasRequiredPermission = requiredPermissions.some(permission =>
            userPermissions.includes(permission)
        );

        if (!hasRequiredPermission) {
            const response: StandardResponseInterface<null> = {
                success: false,
                status: 403,
                message: 'FORBIDDEN',
                code: 'FORBIDDEN',
                data: null,
                errors: [{ field: 'authorization', message: 'Insufficient permissions' }]
            };
            return res.status(403).json(response);
        }

        next();
    };
};