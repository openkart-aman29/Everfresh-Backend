import { Request, Response } from 'express';
import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllStaffService } from '@/features/staff/operations/read_all/service/Read_All_Staff_Service';
import { readAllStaffQuerySchema } from '@/features/staff/zod_schema/Staff_Zod.schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const readAllStaffController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        staffLogger.info('Read all staff - controller', {
            action: 'READ_ALL_STAFF',
            query: req.query,
            companyId: req.user?.company_id,
            userId: req.user?.user_id
        });

        // Validate query parameters
        const validationResult = readAllStaffQuerySchema.safeParse(req.query);

        if (!validationResult.success) {
            const validationErrors = validationResult.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }));

            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: validationErrors
            };

            staffLogger.warn('Validation error in read all staff', {
                action: 'READ_ALL_STAFF',
                errors: validationErrors
            });

            return sendResponse(res, response);
        }

        const { page, limit, search, sortBy, sortOrder, availableOnly } = validationResult.data;
        const offset = (page - 1) * limit;
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
            staffLogger.warn('Company ID missing in request', { action: 'READ_ALL_STAFF' });
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await readAllStaffService({
            companyId,
            page,
            limit,
            offset,
            search,
            sortBy,
            sortOrder,
            availableOnly
        });

        staffLogger.info('Read all staff - controller response', {
            action: 'READ_ALL_STAFF',
            companyId,
            page,
            limit,
            success: serviceResponse.success,
            totalRecords: serviceResponse.data?.pagination.totalRecords
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        staffLogger.error('Unexpected error in read all staff controller', {
            action: 'READ_ALL_STAFF',
            companyId: req.user?.company_id,
            query: req.query,
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