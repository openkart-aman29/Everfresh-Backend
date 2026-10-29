import { Request, Response } from 'express';
import { enquiryLogger } from '@/features/enquiries/logger/Enquiry_Logger';
import { updateEnquiryStatusService } from '@/features/enquiries/operations/update_status/service/Update_Enquiry_Status_Service';
import {
    enquiryIdParamSchema,
    updateEnquiryStatusZodSchema,
} from '@/features/enquiries/zod_schema/Enquiry_Zod_Schema';
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

export const updateEnquiryStatusController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const paramValidation = enquiryIdParamSchema.safeParse(req.params);
        if (!paramValidation.success) {
            const status = 400;
            return sendResponse(res, {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: paramValidation.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            } as StandardResponseInterface<null>);
        }

        const bodyValidation = updateEnquiryStatusZodSchema.safeParse(req.body);
        if (!bodyValidation.success) {
            const status = 400;
            return sendResponse(res, {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: bodyValidation.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            } as StandardResponseInterface<null>);
        }

        const userId = req.user?.user_id;
        if (!userId) {
            const status = 401;
            return sendResponse(res, {
                success: false,
                status,
                message: 'UNAUTHORIZED',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'authorization', message: 'Authentication required' }],
            } as StandardResponseInterface<null>);
        }

        const isSuperAdmin = req.user?.roles.includes('super_admin') ?? false;
        const companyId = isSuperAdmin ? null : (req.user?.company_id ?? null);

        enquiryLogger.info('Update enquiry status - controller', {
            action: 'UPDATE_ENQUIRY_STATUS',
            enquiryId: paramValidation.data.enquiryId,
            userId,
        });

        const serviceResponse = await updateEnquiryStatusService(
            paramValidation.data.enquiryId,
            companyId,
            bodyValidation.data.status,
            bodyValidation.data.admin_notes ?? null,
            userId
        );

        return sendResponse(res, serviceResponse);
    } catch (error) {
        enquiryLogger.error('Unexpected error in update enquiry status controller', { error });
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
