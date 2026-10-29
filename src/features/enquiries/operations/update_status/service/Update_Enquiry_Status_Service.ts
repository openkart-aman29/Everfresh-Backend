import { enquiryLogger } from '@/features/enquiries/logger/Enquiry_Logger';
import { updateEnquiryStatusDAO } from '@/features/enquiries/operations/update_status/dao/Update_Enquiry_Status_Dao';
import { EnquiryRecord, EnquiryStatus } from '@/features/enquiries/interfaces/Enquiry.interface';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

export const updateEnquiryStatusService = async (
    enquiryId: string,
    companyId: string | null,
    status: EnquiryStatus,
    adminNotes: string | null,
    handledBy: string
): Promise<StandardResponseInterface<EnquiryRecord | null>> => {
    try {
        enquiryLogger.info('Update enquiry status - service', {
            action: 'UPDATE_ENQUIRY_STATUS',
            enquiryId,
            status,
        });

        const updated = await updateEnquiryStatusDAO.updateStatus(
            enquiryId,
            companyId,
            status,
            adminNotes,
            handledBy
        );

        // Absent row and wrong-tenant row are indistinguishable by design:
        // reporting "not found" avoids leaking another tenant's ids.
        if (!updated) {
            enquiryLogger.warn('Enquiry not found for status update', { enquiryId, companyId });
            const httpStatus = 404;
            return {
                success: false,
                status: httpStatus,
                message: 'ENQUIRY_NOT_FOUND',
                code: getErrorStatus(httpStatus),
                data: null,
                errors: [{ field: 'enquiryId', message: 'Enquiry not found' }],
            };
        }

        return {
            success: true,
            status: 200,
            message: 'ENQUIRY_STATUS_UPDATED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: updated,
            errors: [],
        };
    } catch (error) {
        enquiryLogger.error('Error in update enquiry status service', { enquiryId, error });
        const httpStatus = 500;
        return {
            success: false,
            status: httpStatus,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(httpStatus),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }],
        };
    }
};
