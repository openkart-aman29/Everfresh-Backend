
import { Request, Response } from 'express';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readCompanyService } from '@/features/company/companies/operations/read/service/Read_Company_Service';
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

export const readCompanyController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        companyLogger.info('Read company - controller', {
            action: 'READ_COMPANY',
            params: req.params,
            userId: req.user?.user_id
        });

        // Validate path parameters
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

        // Optional: Check if user belongs to the company they are trying to read
        // unless they are super_admin
        const userCompanyId = req.user?.company_id;
        const isSuperAdmin = req.user?.roles.includes('super_admin');

        if (userCompanyId !== companyId && !isSuperAdmin) {
            const status = 403;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'FORBIDDEN',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'authorization', message: 'You do not have access to this company' }]
            };
            companyLogger.warn('Unauthorized company access attempt', { userCompanyId, targetCompanyId: companyId });
            return sendResponse(res, response);
        }

        const serviceResponse = await readCompanyService(companyId);

        return sendResponse(res, serviceResponse);

    } catch (error) {
        companyLogger.error('Unexpected error in read company controller', {
            action: 'READ_COMPANY',
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
