import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { ReadAssignedBookingsDAO } from '@/features/staff/operations/read_assigned_bookings/dao/Read_Assigned_Bookings_DAO';
import { StaffDAO } from '@/features/staff/database/dao/Staff_DAO';
import { AssignedBookingsResponse } from '@/features/staff/interfaces/Staff_Assigned_Bookings.interface'

interface ReadAssignedBookingsInput {
    staffId: string;
    companyId: string;
    page: number;
    limit: number;
    offset: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
    sortOrder: string;
}

export const readAssignedBookingsService = async (
    input: ReadAssignedBookingsInput
): Promise<StandardResponseInterface<AssignedBookingsResponse | null>> => {
    try {
        staffLogger.info('Read assigned bookings - service', {
            action: 'READ_ASSIGNED_BOOKINGS',
            staffId: input.staffId,
            companyId: input.companyId,
            page: input.page,
            limit: input.limit,
            status: input.status,
            fromDate: input.fromDate,
            toDate: input.toDate,
            sortOrder: input.sortOrder
        });

        // Validate staff exists and belongs to company
        const staffDAO = new StaffDAO();
        const staff = await staffDAO.getStaffById(input.staffId, input.companyId);

        if (!staff) {
            staffLogger.warn('Staff not found for assigned bookings', {
                action: 'READ_ASSIGNED_BOOKINGS',
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

        // Get assigned bookings
        const assignedBookingsDAO = new ReadAssignedBookingsDAO();
        const result = await assignedBookingsDAO.getBookingsAssignedToStaff(
            input.staffId,
            input.companyId,
            input.limit,
            input.offset,
            input.status,
            input.fromDate,
            input.toDate,
            input.sortOrder
        );

        const totalPages = Math.ceil(result.totalCount / input.limit);

        const responseData: AssignedBookingsResponse = {
            data: result.bookings,
            pagination: {
                page: input.page,
                limit: input.limit,
                totalRecords: result.totalCount,
                totalPages
            }
        };

        staffLogger.info('Assigned bookings retrieved successfully', {
            action: 'READ_ASSIGNED_BOOKINGS',
            staffId: input.staffId,
            companyId: input.companyId,
            totalRecords: result.totalCount,
            returnedRecords: result.bookings.length
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'ASSIGNED_BOOKINGS_RETRIEVED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: responseData,
            errors: []
        };

    } catch (error) {
        staffLogger.error('Error in read assigned bookings service', {
            action: 'READ_ASSIGNED_BOOKINGS',
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
            errors: [{ field: 'server', message: 'Internal server error while retrieving assigned bookings' }]
        };
    }
};