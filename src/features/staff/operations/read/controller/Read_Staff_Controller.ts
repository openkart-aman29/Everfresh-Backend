import { Request, Response } from 'express';
import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readStaffService } from '@/features/staff/operations/read/service/Read_Staff_Service';
import { StaffResponse } from '@/features/staff/interfaces/Staff_Response.interface';
import { staffIdParamSchema } from '@/features/staff/zod_schema/Staff_Zod.schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const readStaffController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        staffLogger.info('Read staff - controller', {
            action: 'READ_STAFF',
            staffId: req.params.staffId,
            companyId: req.user?.company_id,
            userId: req.user?.user_id
        });

        // Validate staff_id parameter
        const staffIdValidation = staffIdParamSchema.safeParse(req.params);

        if (!staffIdValidation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'INVALID_STAFF_ID',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'staff_id', message: 'Invalid staff ID format' }]
            };

            return sendResponse(res, response);
        }

        // Extract parameters
        const { staffId } = staffIdValidation.data;
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
        const serviceResponse = await readStaffService({
            staffId,
            companyId
        });

        staffLogger.info('Read staff - controller response', {
            action: 'READ_STAFF',
            staffId,
            companyId,
            success: serviceResponse.success
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        staffLogger.error('Unexpected error in read staff controller', {
            action: 'READ_STAFF',
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