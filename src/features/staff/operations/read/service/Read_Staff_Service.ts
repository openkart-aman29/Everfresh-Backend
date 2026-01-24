import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { ReadStaffDAO } from '@/features/staff/operations/read/dao/Read_Staff_DAO';
import { mapStaffDBToResponse } from '@/features/staff/utils/Staff_Utils';
import { StaffResponse } from '@/features/staff/interfaces/Staff_Response.interface';

interface ReadStaffInput {
    staffId: string;
    companyId: string;
}

export const readStaffService = async (
    input: ReadStaffInput
): Promise<StandardResponseInterface<StaffResponse | null>> => {
    try {
        staffLogger.info('Read single staff - service', {
            action: 'READ_SINGLE_STAFF',
            staffId: input.staffId,
            companyId: input.companyId
        });

        const staffDAO = new ReadStaffDAO();

        // Fetch staff from DAO
        const staffDB = await staffDAO.getStaffById(input.staffId, input.companyId);

        if (!staffDB) {
            staffLogger.warn('Staff not found', {
                action: 'READ_SINGLE_STAFF',
                staffId: input.staffId,
                companyId: input.companyId
            });

            const status = 404;
            return {
                success: false,
                status,
                message: 'STAFF_NOT_FOUND',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'staffId', message: 'Staff not found or does not belong to this company' }]
            };
        }

        // Map DB result to API response
        const staffResponse = mapStaffDBToResponse(staffDB);

        staffLogger.info('Staff fetched successfully', {
            action: 'READ_SINGLE_STAFF',
            staffId: input.staffId,
            companyId: input.companyId
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'STAFF_RETRIEVED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: staffResponse,
            errors: []
        };

    } catch (error) {
        staffLogger.error('Error in read single staff service', {
            action: 'READ_SINGLE_STAFF',
            staffId: input.staffId,
            companyId: input.companyId,
            error
        });

        const status = 500;
        return {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error while retrieving staff' }]
        };
    }
};