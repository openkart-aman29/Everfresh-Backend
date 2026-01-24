import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { UpdateStaffDAO } from '@/features/staff/operations/update/dao/Update_Staff_DAO';
import { mapStaffDBToResponse } from '@/features/staff/utils/Staff_Utils';
import { StaffResponse } from '@/features/staff/interfaces/Staff_Response.interface';

interface UpdateStaffInput {
    staffId: string;
    companyId: string;
    updates: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        isAvailable?: boolean;
        skills?: string[];
    };
}

export const updateStaffService = async (
    input: UpdateStaffInput
): Promise<StandardResponseInterface<StaffResponse | null>> => {
    try {
        staffLogger.info('Update staff - service', {
            action: 'UPDATE_STAFF',
            staffId: input.staffId,
            companyId: input.companyId,
            updatedFields: Object.keys(input.updates)
        });

        const updateDAO = new UpdateStaffDAO();

        // Update staff
        const updatedStaffDB = await updateDAO.updateStaff(
            input.staffId,
            input.companyId,
            input.updates
        );

        if (!updatedStaffDB) {
            staffLogger.warn('Staff not found for update', {
                action: 'UPDATE_STAFF',
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

        // Map to response
        const staffResponse = mapStaffDBToResponse(updatedStaffDB);

        staffLogger.info('Staff updated successfully', {
            action: 'UPDATE_STAFF',
            staffId: input.staffId,
            companyId: input.companyId,
            updatedFields: Object.keys(input.updates)
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'STAFF_UPDATED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: staffResponse,
            errors: []
        };

    } catch (error) {
        staffLogger.error('Error in update staff service', {
            action: 'UPDATE_STAFF',
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
            errors: [{ field: 'server', message: 'Internal server error while updating staff' }]
        };
    }
};