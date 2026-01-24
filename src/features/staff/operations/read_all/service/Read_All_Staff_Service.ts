import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllStaffDAO } from '@/features/staff/operations/read_all/dao/Read_All_Staff_DAO';
import { StaffResponse } from '@/features/staff/interfaces/Staff_Response.interface';

interface ReadAllStaffInput {
    companyId: string;
    page: number;
    limit: number;
    offset: number;
    search?: string;
    sortBy: string;
    sortOrder: string;
    availableOnly?: boolean;
}

interface PaginatedStaffResponse {
    data: StaffResponse[];
    pagination: {
        page: number;
        limit: number;
        totalRecords: number;
        totalPages: number;
    };
}

export const readAllStaffService = async (
    input: ReadAllStaffInput
): Promise<StandardResponseInterface<PaginatedStaffResponse | null>> => {
    try {
        staffLogger.info('Read all staff - service', {
            action: 'READ_ALL_STAFF',
            companyId: input.companyId,
            page: input.page,
            limit: input.limit,
            search: input.search,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder,
            availableOnly: input.availableOnly
        });

        // Call DAO
        const result = await readAllStaffDAO(
            input.companyId,
            input.limit,
            input.offset,
            input.search,
            input.sortBy,
            input.sortOrder,
            input.availableOnly
        );

        if (!result.success) {
            staffLogger.error('DAO failure in read all staff service', {
                action: 'READ_ALL_STAFF',
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
                errors: [{ field: 'server', message: 'Database error while retrieving staff' }]
            };
        }

        const { staff, totalCount } = result.data!;
        const totalPages = Math.ceil(totalCount / input.limit);

        const responseData: PaginatedStaffResponse = {
            data: staff,
            pagination: {
                page: input.page,
                limit: input.limit,
                totalRecords: totalCount,
                totalPages
            }
        };

        staffLogger.info('Staff list retrieved successfully', {
            action: 'READ_ALL_STAFF',
            companyId: input.companyId,
            totalRecords: totalCount,
            returnedRecords: staff.length
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'STAFF_RETRIEVED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: responseData,
            errors: []
        };

    } catch (error) {
        staffLogger.error('Error in read all staff service', {
            action: 'READ_ALL_STAFF',
            companyId: input.companyId,
            page: input.page,
            limit: input.limit,
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