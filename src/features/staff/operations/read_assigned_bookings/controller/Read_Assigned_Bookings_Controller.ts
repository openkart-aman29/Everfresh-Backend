import { Request, Response } from 'express';
import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAssignedBookingsService } from '@/features/staff/operations/read_assigned_bookings/service/Read_Assigned_Bookings_Service';
import { staffIdParamSchema, readAssignedBookingsQuerySchema } from '@/features/staff/zod_schema/Staff_Zod.schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const readAssignedBookingsController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        staffLogger.info('Read assigned bookings - controller', {
            action: 'READ_ASSIGNED_BOOKINGS',
            staffId: req.params.staffId,
            query: req.query,
            companyId: req.user?.company_id,
            userId: req.user?.user_id
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

        // Validate query parameters
        const queryValidation = readAssignedBookingsQuerySchema.safeParse(req.query);
        if (!queryValidation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: queryValidation.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            };
            return sendResponse(res, response);
        }

        const { staffId } = paramValidation.data;
        const { page, limit, status, fromDate, toDate, sortOrder } = queryValidation.data;
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
            staffLogger.warn('Company ID missing in request', { staffId });
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await readAssignedBookingsService({
            staffId,
            companyId,
            page,
            limit,
            offset,
            status,
            fromDate,
            toDate,
            sortOrder
        });

        staffLogger.info('Read assigned bookings - controller response', {
            action: 'READ_ASSIGNED_BOOKINGS',
            staffId,
            companyId,
            success: serviceResponse.success,
            totalRecords: serviceResponse.data?.pagination.totalRecords
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        staffLogger.error('Unexpected error in read assigned bookings controller', {
            action: 'READ_ASSIGNED_BOOKINGS',
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