import { enquiryLogger } from '@/features/enquiries/logger/Enquiry_Logger';
import { readAllEnquiriesDAO } from '@/features/enquiries/operations/read_all/dao/Read_All_Enquiries_Dao';
import { ReadAllEnquiriesResult, EnquiryStatus } from '@/features/enquiries/interfaces/Enquiry.interface';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

export const readAllEnquiriesService = async (
    companyId: string | null,
    status: EnquiryStatus | undefined,
    page: number,
    limit: number
): Promise<StandardResponseInterface<ReadAllEnquiriesResult | null>> => {
    try {
        enquiryLogger.info('Read all enquiries - service', {
            action: 'READ_ALL_ENQUIRIES',
            companyId,
            status,
            page,
            limit,
        });

        const { rows, total } = await readAllEnquiriesDAO.listEnquiries(companyId, status, page, limit);

        return {
            success: true,
            status: 200,
            message: 'ENQUIRIES_FETCHED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: { enquiries: rows, total, page, limit },
            errors: [],
        };
    } catch (error) {
        enquiryLogger.error('Error in read all enquiries service', { error });
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
