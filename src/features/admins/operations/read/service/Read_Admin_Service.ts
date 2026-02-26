
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { ReadAdminDAO } from '@/features/admins/operations/read/dao/Read_Admin_Dao';
import { AdminDetailsResponse } from '@/features/admins/interfaces/Admin_Response.interface';
import { adminLogger } from '@/features/admins/logger/Admin_Logger';

interface ReadAdminInput {
    adminId: string;
    companyId: string | null;
}

export const readAdminService = async (
    input: ReadAdminInput
): Promise<StandardResponseInterface<AdminDetailsResponse | null>> => {
    try {
        adminLogger.info('Read single admin - service', {
            action: 'READ_SINGLE_ADMIN',
            adminId: input.adminId,
            companyId: input.companyId
        });

        const adminDAO = new ReadAdminDAO();

        // Fetch admin from DAO
        const adminData = await adminDAO.getAdminById(input.adminId, input.companyId);

        if (!adminData) {
            adminLogger.warn('Admin not found', {
                action: 'READ_SINGLE_ADMIN',
                adminId: input.adminId,
                companyId: input.companyId
            });

            const status = 404;
            return {
                success: false,
                status,
                message: 'ADMIN_NOT_FOUND',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'adminId', message: 'Admin not found or does not belong to this company' }]
            };
        }

        adminLogger.info('Admin fetched successfully', {
            action: 'READ_SINGLE_ADMIN',
            adminId: input.adminId,
            companyId: input.companyId
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'ADMIN_RETRIEVED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: adminData,
            errors: []
        };

    } catch (error) {
        adminLogger.error('Error in read single admin service', {
            action: 'READ_SINGLE_ADMIN',
            adminId: input.adminId,
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
            errors: [{ field: 'server', message: 'Internal server error while retrieving admin' }]
        };
    }
};
