
import { Request, Response } from 'express';
import { adminLogger } from '@/features/admins/logger/Admin_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { updateAdminService } from '@/features/admins/operations/update/service/Update_Admin_Service';
import { adminReadParamsSchema, updateAdminBodySchema } from '@/features/admins/zod_schema/Admin_Zod_Schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const updateAdminController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        adminLogger.info('Update admin - controller', {
            action: 'UPDATE_ADMIN',
            params: req.params,
            body: req.body,
            companyId: req.user?.company_id,
            userId: req.user?.user_id
        });

        // Validate path parameters (admin_id)
        // Note: adminReadParamsSchema expects { admin_id: ... }
        const paramValidation = adminReadParamsSchema.safeParse(req.params);
        if (!paramValidation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: paramValidation.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            };
            return sendResponse(res, response);
        }

        // Validate request body
        const bodyValidation = updateAdminBodySchema.safeParse(req.body);
        if (!bodyValidation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: bodyValidation.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            };
            return sendResponse(res, response);
        }

        const { admin_id } = paramValidation.data;
        const updates = bodyValidation.data;
        const isSuperAdmin = req.user?.roles?.includes('super_admin');
        const companyId: string | null = req.user?.company_id || null;

        if (!companyId && !isSuperAdmin) {
            const status = 401;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'UNAUTHORIZED',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'authorization', message: 'Company ID not found in request' }]
            };
            adminLogger.warn('Company ID missing in request', { action: 'UPDATE_ADMIN' });
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await updateAdminService({
            adminId: admin_id,
            companyId,
            updates
        });

        adminLogger.info('Update admin - controller response', {
            action: 'UPDATE_ADMIN',
            adminId: admin_id,
            success: serviceResponse.success
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        adminLogger.error('Unexpected error in update admin controller', {
            action: 'UPDATE_ADMIN',
            params: req.params,
            error
        });

        const status = 500;
        const response: StandardResponseInterface<null> = {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }]
        };

        return sendResponse(res, response);
    }
};
