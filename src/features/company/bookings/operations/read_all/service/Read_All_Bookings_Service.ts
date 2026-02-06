// // src/features/bookings/operations/read_all/service/Read_All_Bookings_Service.ts
// import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
// import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
// import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
// import { readAllBookingsDAO } from '@/features/company/bookings/operations/read_all/dao/Read_All_Bookings_DAO';
// import { BookingListResponseInterface } from '@/features/company/bookings/interface/Booking_Filter_Interface';

// interface ReadAllBookingsFilters {
//     company_id: string;
//     page: number;
//     limit: number;
//     sort_by: string;
//     sort_order: 'ASC' | 'DESC';
//     customer_id?: string;
//     service_id?: string;
//     staff_id?: string;
//     status?: string | string[];
//     scheduled_date_from?: Date;
//     scheduled_date_to?: Date;
//     search?: string;
//     payment_status?: 'unpaid' | 'partial' | 'paid';
// }

// /**
//  * Service: List bookings with pagination and filters
//  */
// export const readAllBookingsService = async (
//     filters: ReadAllBookingsFilters
// ): Promise<StandardResponseInterface<BookingListResponseInterface | null>> => {
//     try {
//         bookingLogger.info('Listing bookings - service', {
//             company_id: filters.company_id,
//             page: filters.page,
//             limit: filters.limit
//         });
        
//         // Fetch bookings from database
//         const result = await readAllBookingsDAO(filters);
        
//         if (!result.success) {
//             const status = 500;
//             return {
//                 success: false,
//                 message: 'BOOKINGS_FETCH_FAILED',
//                 status,
//                 code: getErrorStatus(status),
//                 data: null,
//                 errors: [{ field: 'database', message: 'Failed to fetch bookings' }],
//             };
//         }
        
//         bookingLogger.info('Bookings fetched successfully', {
//             total: result.data?.total,
//             page: result.data?.page
//         });
        
//         const status = 200;
//         return {
//             success: true,
//             message: 'BOOKINGS_FETCHED_SUCCESSFULLY',
//             status,
//             code: 'SUCCESS',
//             data: result.data!,
//             errors: [],
//         };
        
//     } catch (error) {
//         bookingLogger.error('Error in read all bookings service', error);
        
//         const status = 500;
//         return {
//             success: false,
//             message: 'INTERNAL_SERVER_ERROR',
//             status,
//             code: getErrorStatus(status),
//             data: null,
//             errors: [{ field: 'server', message: 'Internal server error' }],
//         };
//     }
// };

// src/features/bookings/operations/read_all/service/Read_All_Bookings_Service.ts
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllBookingsDAO } from '@/features/company/bookings/operations/read_all/dao/Read_All_Bookings_DAO';
import { BookingListResponseInterface } from '@/features/company/bookings/interface/Booking_Filter_Interface';

interface ReadAllBookingsFilters {
    company_id: string;
    page: number;
    limit: number;
    sort_by: string;
    sort_order: 'ASC' | 'DESC';
    customer_id?: string;
    service_id?: string;
    staff_id?: string;
    status?: string | string[];
    search?: string;
}

/**
 * Service: List bookings from today to next 6 days
 * Shows ALL statuses: pending, confirmed, cancelled, etc.
 */
export const readAllBookingsService = async (
    filters: ReadAllBookingsFilters
): Promise<StandardResponseInterface<BookingListResponseInterface | null>> => {
    try {
        bookingLogger.info('Listing bookings (next 7 days) - service', {
            company_id: filters.company_id,
            page: filters.page,
            limit: filters.limit,
            status_filter: filters.status || 'all'
        });
        
        const result = await readAllBookingsDAO(filters);
        
        if (!result.success) {
            const status = 500;
            return {
                success: false,
                message: 'BOOKINGS_FETCH_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to fetch bookings' }],
            };
        }
        
        bookingLogger.info('Bookings fetched successfully', {
            total: result.data?.total,
            page: result.data?.page,
            bookings_returned: result.data?.bookings.length
        });
        
        const status = 200;
        return {
            success: true,
            message: 'BOOKINGS_FETCHED_SUCCESSFULLY',
            status,
            code: 'SUCCESS',
            data: result.data!,
            errors: [],
        };
        
    } catch (error) {
        bookingLogger.error('Error in read all bookings service', error);
        
        const status = 500;
        return {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }],
        };
    }
};