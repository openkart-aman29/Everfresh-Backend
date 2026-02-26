
import { Request, Response } from 'express';
import { adminLogger } from '@/features/admins/logger/Admin_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllAdminsService } from '@/features/admins/operations/read_all/service/Read_All_Admin_Service';
import { readAllAdminsQuerySchema } from '@/features/admins/zod_schema/Admin_Zod_Schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const readAllAdminsController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        adminLogger.info('Read all admins - controller', {
            action: 'READ_ALL_ADMINS',
            query: req.query,
            companyId: req.user?.company_id,
            userId: req.user?.user_id
        });

        // Validate query parameters
        const validationResult = readAllAdminsQuerySchema.safeParse(req.query);

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

            adminLogger.warn('Validation error in read all admins', {
                action: 'READ_ALL_ADMINS',
                errors: validationErrors
            });

            return sendResponse(res, response);
        }

        const { page, limit, search, sort_by, sort_order, is_active, company_id: queryCompanyId } = validationResult.data;
        const offset = (page - 1) * limit;

        const isSuperAdmin = req.user?.roles?.includes('super_admin');
        let companyId: string | null = req.user?.company_id || null;

        if (isSuperAdmin) {
            companyId = queryCompanyId || null;
        }

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
            adminLogger.warn('Company ID missing in request', { action: 'READ_ALL_ADMINS' });
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await readAllAdminsService({
            companyId,
            page,
            limit,
            offset,
            search,
            sortBy: sort_by,
            sortOrder: sort_order,
            isActive: is_active
        });

        adminLogger.info('Read all admins - controller response', {
            action: 'READ_ALL_ADMINS',
            companyId,
            page,
            limit,
            success: serviceResponse.success,
            totalRecords: serviceResponse.data?.pagination.totalRecords
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        adminLogger.error('Unexpected error in read all admins controller', {
            action: 'READ_ALL_ADMINS',
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
