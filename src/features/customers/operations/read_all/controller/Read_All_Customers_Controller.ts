import { Request, Response } from 'express';
import { customerLogger } from '@/features/customers/logger/Customer_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllCustomersService } from '@/features/customers/operations/read_all/service/Read_All_Customers_Service';
import { readAllCustomersQuerySchema } from '@/features/customers/zod_schema/Customer_Zod.schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const readAllCustomersController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        customerLogger.info('Read all customers - controller', {
            action: 'READ_ALL_CUSTOMERS',
            query: req.query,
            companyId: req.user?.company_id,
            userId: req.user?.user_id
        });

        // Validate query parameters
        const validationResult = readAllCustomersQuerySchema.safeParse(req.query);

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

            customerLogger.warn('Validation error in read all customers', {
                action: 'READ_ALL_CUSTOMERS',
                errors: validationErrors
            });

            return sendResponse(res, response);
        }

        const { page, limit, search, sortBy, sortOrder } = validationResult.data;
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
            customerLogger.warn('Company ID missing in request', { action: 'READ_ALL_CUSTOMERS' });
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await readAllCustomersService({
            companyId,
            page,
            limit,
            offset,
            search,
            sortBy,
            sortOrder
        });

        customerLogger.info('Read all customers - controller response', {
            action: 'READ_ALL_CUSTOMERS',
            companyId,
            page,
            limit,
            success: serviceResponse.success,
            totalRecords: serviceResponse.data?.pagination.totalRecords
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        customerLogger.error('Unexpected error in read all customers controller', {
            action: 'READ_ALL_CUSTOMERS',
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