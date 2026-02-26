
import { Request, Response } from 'express';
import { adminLogger } from '@/features/admins/logger/Admin_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { deleteAdminService } from '@/features/admins/operations/delete/service/Delete_Admin_Service';
import { deleteAdminParamsSchema } from '@/features/admins/zod_schema/Admin_Zod_Schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const deleteAdminController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        adminLogger.info('Delete admin - controller', {
            action: 'DELETE_ADMIN',
            adminId: req.params.admin_id,
            companyId: req.user?.company_id,
            userId: req.user?.user_id
        });

        // Validate path parameters using the existing schema
        const paramValidation = deleteAdminParamsSchema.safeParse(req.params);
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

        const { admin_id } = paramValidation.data;
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
            adminLogger.warn('Company ID missing in request', { adminId: admin_id });
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await deleteAdminService({
            adminId: admin_id,
            companyId
        });

        adminLogger.info('Delete admin - controller response', {
            action: 'DELETE_ADMIN',
            adminId: admin_id,
            success: serviceResponse.success
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        adminLogger.error('Unexpected error in delete admin controller', {
            action: 'DELETE_ADMIN',
            adminId: req.params.admin_id,
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
