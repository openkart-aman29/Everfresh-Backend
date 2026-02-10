// import { staffLogger } from '@/features/staff/logger/Staff_Logger';
// import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
// import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
// import { ReadStaffDAO } from '@/features/staff/operations/read/dao/Read_Staff_DAO';
// import { mapStaffDBToResponse } from '@/features/staff/utils/Staff_Utils';
// import { StaffResponse } from '@/features/staff/interfaces/Staff_Response.interface';

// interface ReadStaffInput {
//     staffId: string;
//     companyId: string;
// }

// export const readStaffService = async (
//     input: ReadStaffInput
// ): Promise<StandardResponseInterface<StaffResponse | null>> => {
//     try {
//         staffLogger.info('Read single staff - service', {
//             action: 'READ_SINGLE_STAFF',
//             staffId: input.staffId,
//             companyId: input.companyId
//         });

//         const staffDAO = new ReadStaffDAO();

//         // Fetch staff from DAO
//         const staffDB = await staffDAO.getStaffById(input.staffId, input.companyId);

//         if (!staffDB) {
//             staffLogger.warn('Staff not found', {
//                 action: 'READ_SINGLE_STAFF',
//                 staffId: input.staffId,
//                 companyId: input.companyId
//             });

//             const status = 404;
//             return {
//                 success: false,
//                 status,
//                 message: 'STAFF_NOT_FOUND',
//                 code: getErrorStatus(status),
//                 data: null,
//                 errors: [{ field: 'staffId', message: 'Staff not found or does not belong to this company' }]
//             };
//         }

//         // Map DB result to API response
//         const staffResponse = mapStaffDBToResponse(staffDB);

//         staffLogger.info('Staff fetched successfully', {
//             action: 'READ_SINGLE_STAFF',
//             staffId: input.staffId,
//             companyId: input.companyId
//         });

//         const status = 200;
//         return {
//             success: true,
//             status,
//             message: 'STAFF_RETRIEVED_SUCCESSFULLY',
//             code: 'SUCCESS',
//             data: staffResponse,
//             errors: []
//         };

//     } catch (error) {
//         staffLogger.error('Error in read single staff service', {
//             action: 'READ_SINGLE_STAFF',
//             staffId: input.staffId,
//             companyId: input.companyId,
//             error
//         });

//         const status = 500;
//         return {
//             success: false,
//             status,
//             message: 'INTERNAL_SERVER_ERROR',
//             code: getErrorStatus(status),
//             data: null,
//             errors: [{ field: 'server', message: 'Internal server error while retrieving staff' }]
//         };
//     }
// };



// src/features/staff/operations/read/service/Read_Staff_Service.ts

import { staffLogger } from '@/features/staff/logger/Staff_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { ReadStaffDAO } from '@/features/staff/operations/read/dao/Read_Staff_DAO';
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

        // 🔥 Fetch staff with work metrics
        const staffData = await staffDAO.getStaffById(input.staffId, input.companyId);

        if (!staffData) {
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

        // 🔥 Fetch first confirmed booking
        const firstBooking = await staffDAO.getFirstConfirmedBooking(
            input.staffId,
            input.companyId
        );

        // Build response
        const staffResponse: StaffResponse = {
            staff_id: staffData.staff_id,
            company_id: staffData.company_id,
            user_id: staffData.user_id,
            email: staffData.email,
            first_name: staffData.first_name,
            last_name: staffData.last_name,
            phone: staffData.phone,
            is_available: staffData.is_available,
            skills: staffData.skills,
            is_Active: staffData.is_active,
            created_at: staffData.created_at,
            updated_at: staffData.updated_at,
            
            // 🔥 Work Metrics
            work_metrics: {
                total_hours_worked: staffData.total_hours_worked,
                current_month_hours: staffData.current_month_hours
            },
            
            // 🔥 Next Confirmed Booking
            next_confirmed_booking: firstBooking
        };

        staffLogger.info('Staff fetched successfully', {
            action: 'READ_SINGLE_STAFF',
            staffId: input.staffId,
            companyId: input.companyId,
            has_next_booking: !!firstBooking,
            total_hours: staffData.total_hours_worked
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