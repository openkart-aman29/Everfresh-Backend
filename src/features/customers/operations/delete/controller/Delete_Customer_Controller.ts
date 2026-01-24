import { Request, Response } from 'express';
import { customerLogger } from '@/features/customers/logger/Customer_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { deleteCustomerService } from '@/features/customers/operations/delete/service/Delete_Customer_Service';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const deleteCustomerController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        customerLogger.info('Delete customer - controller', {
            action: 'DELETE_CUSTOMER',
            customerId: req.params.customerId,
            companyId: req.user?.company_id,
            userId: req.user?.user_id
        });

        // Validate customer_id parameter
        const customerIdValidation = ulidZodSchema.safeParse(req.params.customerId);

        if (!customerIdValidation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'INVALID_CUSTOMER_ID',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'customer_id', message: 'Invalid customer ID format' }]
            };

            return sendResponse(res, response);
        }

        // Extract parameters
        const customerId = customerIdValidation.data;
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
            customerLogger.warn('Company ID missing in request', { customerId });
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await deleteCustomerService({
            customerId,
            companyId
        });

        customerLogger.info('Delete customer - controller response', {
            action: 'DELETE_CUSTOMER',
            customerId,
            companyId,
            success: serviceResponse.success
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        customerLogger.error('Unexpected error in delete customer controller', {
            action: 'DELETE_CUSTOMER',
            customerId: req.params.customerId,
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