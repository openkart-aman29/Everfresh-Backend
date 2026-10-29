import { Request, Response } from 'express';
import { enquiryLogger } from '@/features/enquiries/logger/Enquiry_Logger';
import { readAllEnquiriesService } from '@/features/enquiries/operations/read_all/service/Read_All_Enquiries_Service';
import { readAllEnquiriesQuerySchema } from '@/features/enquiries/zod_schema/Enquiry_Zod_Schema';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
    };
}

export const readAllEnquiriesController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const validation = readAllEnquiriesQuerySchema.safeParse(req.query);

        if (!validation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            };
            return sendResponse(res, response);
        }

        const { status, page, limit } = validation.data;

        // Super admins oversee every tenant, so their company filter is dropped.
        const isSuperAdmin = req.user?.roles.includes('super_admin') ?? false;
        const companyId = isSuperAdmin ? null : (req.user?.company_id ?? null);

        enquiryLogger.info('Read all enquiries - controller', {
            action: 'READ_ALL_ENQUIRIES',
            userId: req.user?.user_id,
            isSuperAdmin,
        });

        const serviceResponse = await readAllEnquiriesService(companyId, status, page, limit);

        return sendResponse(res, serviceResponse);
    } catch (error) {
        enquiryLogger.error('Unexpected error in read all enquiries controller', { error });
        const status = 500;
        return sendResponse(res, {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }],
        } as StandardResponseInterface<null>);
    }
};
