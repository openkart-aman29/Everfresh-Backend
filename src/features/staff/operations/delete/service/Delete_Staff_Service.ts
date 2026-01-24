import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { DeleteStaffDAO } from '@/features/staff/operations/delete/dao/Delete_Staff_DAO';

interface DeleteStaffInput {
    staffId: string;
    companyId: string;
}

export const deleteStaffService = async (
    input: DeleteStaffInput
): Promise<StandardResponseInterface<null>> => {
    try {
        staffLogger.info('Delete staff - service', {
            action: 'DELETE_STAFF',
            staffId: input.staffId,
            companyId: input.companyId
        });

        const deleteDAO = new DeleteStaffDAO();

        // Attempt soft delete
        const deleted = await deleteDAO.softDeleteStaffAndUser(input.staffId, input.companyId);

        if (!deleted) {
            staffLogger.warn('Staff not found for deletion', {
                action: 'DELETE_STAFF',
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

        staffLogger.info('Staff deleted successfully', {
            action: 'DELETE_STAFF',
            staffId: input.staffId,
            companyId: input.companyId
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'STAFF_DELETED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: null,
            errors: []
        };

    } catch (error) {
        staffLogger.error('Error in delete staff service', {
            action: 'DELETE_STAFF',
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
            errors: [{ field: 'server', message: 'Internal server error while deleting staff' }]
        };
    }
};