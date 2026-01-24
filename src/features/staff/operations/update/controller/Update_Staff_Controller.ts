import { Request, Response } from 'express';
import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { updateStaffService } from '@/features/staff/operations/update/service/Update_Staff_Service';
import { staffIdParamSchema, updateStaffBodySchema } from '@/features/staff/zod_schema/Staff_Zod.schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const updateStaffController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        staffLogger.info('Update staff - controller', {
            action: 'UPDATE_STAFF',
            staffId: req.params.staffId,
            companyId: req.user?.company_id,
            userId: req.user?.user_id,
            body: req.body
        });

        // Validate path parameters
        const paramValidation = staffIdParamSchema.safeParse(req.params);
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
        const bodyValidation = updateStaffBodySchema.safeParse(req.body);
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

        const { staffId } = paramValidation.data;
        const updates = bodyValidation.data;
        const companyId = req.user?.company_id;

        if (!companyId) {
            const status = 401;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'UNAUTHORIZED',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'authorization', message: 'Company ID not found in request' }]
            };
            staffLogger.warn('Company ID missing in request', { staffId });
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await updateStaffService({
            staffId,
            companyId,
            updates
        });

        staffLogger.info('Update staff - controller response', {
            action: 'UPDATE_STAFF',
            staffId,
            companyId,
            success: serviceResponse.success
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        staffLogger.error('Unexpected error in update staff controller', {
            action: 'UPDATE_STAFF',
            staffId: req.params.staffId,
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