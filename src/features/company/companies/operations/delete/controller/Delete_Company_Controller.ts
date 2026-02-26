
import { Request, Response } from 'express';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { deleteCompanyService } from '@/features/company/companies/operations/delete/service/Delete_Company_Service';
import { companyIdParamSchema } from '@/features/company/companies/zod_schema/Company_Zod_Schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const deleteCompanyController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        companyLogger.info('Delete company - controller', {
            action: 'DELETE_COMPANY',
            companyId: req.params.companyId,
            userId: req.user?.user_id
        });

        // 1. Authorization Check: Only Super Admin can delete companies
        const isSuperAdmin = req.user?.roles.includes('super_admin');
        if (!isSuperAdmin) {
            const status = 403;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'FORBIDDEN',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'authorization', message: 'Only Super Admins can delete companies' }]
            };
            companyLogger.warn('Unauthorized company delete attempt', { userId: req.user?.user_id });
            return sendResponse(res, response);
        }

        // 2. Validate Path Parameters
        const paramValidation = companyIdParamSchema.safeParse(req.params);
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

        const { companyId } = paramValidation.data;

        // 3. Call Service
        const serviceResponse = await deleteCompanyService(companyId);

        return sendResponse(res, serviceResponse);

    } catch (error) {
        companyLogger.error('Unexpected error in delete company controller', {
            action: 'DELETE_COMPANY',
            companyId: req.params.companyId,
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
