
import { Request, Response } from 'express';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllCompaniesService } from '@/features/company/companies/operations/read_all/service/Read_All_Company_Service';
import { readAllCompaniesQuerySchema } from '@/features/company/companies/zod_schema/Company_Zod_Schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const readAllCompaniesController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        companyLogger.info('Read all companies - controller', {
            action: 'READ_ALL_COMPANIES',
            query: req.query,
            userId: req.user?.user_id
        });

        // 1. Authorization Check: Only Super Admin can list all companies
        const isSuperAdmin = req.user?.roles.includes('super_admin');
        if (!isSuperAdmin) {
            const status = 403;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'FORBIDDEN',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'authorization', message: 'Only Super Admins can list all companies' }]
            };
            companyLogger.warn('Unauthorized read-all companies attempt', { userId: req.user?.user_id });
            return sendResponse(res, response);
        }

        // 2. Validate Query Parameters
        const queryValidation = readAllCompaniesQuerySchema.safeParse(req.query);
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

        const { page, limit, search, sortBy, sortOrder, is_active, subscription_tier } = queryValidation.data;
        const offset = (page - 1) * limit;

        // 3. Call Service
        const serviceResponse = await readAllCompaniesService({
            page,
            limit,
            offset,
            search,
            sortBy,
            sortOrder,
            is_active,
            subscription_tier
        });

        return sendResponse(res, serviceResponse);

    } catch (error) {
        companyLogger.error('Unexpected error in read all companies controller', {
            action: 'READ_ALL_COMPANIES',
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
