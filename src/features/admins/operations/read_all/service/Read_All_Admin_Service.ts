
import { adminLogger } from '@/features/admins/logger/Admin_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllAdminDAO } from '@/features/admins/operations/read_all/dao/Read_All_Admin_Dao';
import { ReadAllAdminsInput } from '@/features/admins/interfaces/Admin_Request.interface';
import { PaginatedAdminResponse } from '@/features/admins/interfaces/Admin_Response.interface';

export const readAllAdminsService = async (
    input: ReadAllAdminsInput
): Promise<StandardResponseInterface<PaginatedAdminResponse | null>> => {
    try {
        adminLogger.info('Read all admins - service', {
            action: 'READ_ALL_ADMINS',
            companyId: input.companyId,
            page: input.page,
            limit: input.limit,
            search: input.search,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder,
            isActive: input.isActive
        });

        // Call DAO
        const result = await readAllAdminDAO(
            input.companyId,
            input.limit,
            input.offset,
            input.search,
            input.sortBy,
            input.sortOrder,
            input.isActive
        );

        if (!result.success || !result.data) {
            adminLogger.error('DAO failure in read all admins service', {
                action: 'READ_ALL_ADMINS',
                companyId: input.companyId,
                page: input.page,
                limit: input.limit
            });

            const status = 500;
            return {
                success: false,
                status,
                message: 'INTERNAL_SERVER_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'server', message: 'Database error while retrieving admins' }]
            };
        }

        const { admins, totalCount } = result.data;
        const totalPages = Math.ceil(totalCount / input.limit);

        const responseData: PaginatedAdminResponse = {
            data: admins,
            pagination: {
                page: input.page,
                limit: input.limit,
                totalRecords: totalCount,
                totalPages
            }
        };

        adminLogger.info('Admin list retrieved successfully', {
            action: 'READ_ALL_ADMINS',
            companyId: input.companyId,
            totalRecords: totalCount,
            returnedRecords: admins.length
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'ADMINS_RETRIEVED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: responseData,
            errors: []
        };

    } catch (error) {
        adminLogger.error('Error in read all admins service', {
            action: 'READ_ALL_ADMINS',
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
            errors: [{ field: 'server', message: 'Internal server error while retrieving admins' }]
        };
    }
};
