
import { Request, Response } from 'express';
import { adminLogger } from '@/features/admins/logger/Admin_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAdminService } from '@/features/admins/operations/read/service/Read_Admin_Service';
import { adminReadParamsSchema } from '@/features/admins/zod_schema/Admin_Zod_Schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const readAdminController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        adminLogger.info('Read admin - controller', {
            action: 'READ_ADMIN',
            adminId: req.params.adminId, // Log raw param for debugging
            companyId: req.user?.company_id,
            userId: req.user?.user_id
        });

        // Validate admin_id parameter
        // Route is /:adminId, so req.params has adminId.
        // Schema expects admin_id. We need to map or validate against the raw object if keys match.
        // Best practice: Construct the object expected by schema.
        const validationPayload = { admin_id: req.params.adminId };
        const adminIdValidation = adminReadParamsSchema.safeParse(validationPayload);

        if (!adminIdValidation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'INVALID_ADMIN_ID',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'admin_id', message: 'Invalid admin ID format' }]
            };

            return sendResponse(res, response);
        }

        // Extract parameters
        const { admin_id } = adminIdValidation.data;

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
        const serviceResponse = await readAdminService({
            adminId: admin_id,
            companyId
        });

        adminLogger.info('Read admin - controller response', {
            action: 'READ_ADMIN',
            adminId: admin_id,
            companyId,
            success: serviceResponse.success
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        adminLogger.error('Unexpected error in read admin controller', {
            action: 'READ_ADMIN',
            adminId: req.params.adminId,
            companyId: req.user?.company_id,
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
