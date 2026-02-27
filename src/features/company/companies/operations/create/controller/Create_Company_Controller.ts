import { Request, Response } from 'express';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { createCompanyService } from '@/features/company/companies/operations/create/service/Create_Company_Service';
import { createCompanyBodySchema } from '@/features/company/companies/zod_schema/Company_Zod_Schema';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
        permissions?: string[];
    };
}

export const createCompanyController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const startTime = Date.now();
        companyLogger.info('Create company - controller', {
            action: 'CREATE_COMPANY',
            userId: req.user?.user_id
        });

        // 1. Validate payload
        const validation = createCompanyBodySchema.safeParse(req.body);
        if (!validation.success) {
            companyLogger.warn('Validation error creating company', { errors: validation.error.format() });
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: validation.error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }))
            };
            return sendResponse(res, response);
        }

        const inputData = validation.data;

        // 2. Delegate to Service
        const serviceResponse = await createCompanyService(inputData);

        const duration = Date.now() - startTime;
        companyLogger.info('Create company controller completed', {
            durationMs: duration
        });

        const status = serviceResponse.status;
        const finalResponse: StandardResponseInterface<any> = {
            success: serviceResponse.success,
            status,
            message: serviceResponse.success ? 'COMPANY_CREATED_SUCCESSFULLY' : (serviceResponse.error || 'ERROR'),
            code: getErrorStatus(status) || 'SUCCESS',
            data: serviceResponse.data || null,
            errors: []
        };

        if (!serviceResponse.success && serviceResponse.error) {
            finalResponse.errors = [{ field: 'database', message: serviceResponse.error }];
        }

        return sendResponse(res, finalResponse);

    } catch (error: any) {
        companyLogger.error('Controller error creating company', { error: error.message });
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

