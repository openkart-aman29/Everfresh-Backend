// src/features/bookings/operations/read/service/Read_Booking_Service.ts
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readBookingDAO } from '@/features/company/bookings/operations/read/dao/Read_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

/**
 * Service: Get single booking with full details
 */
export const readBookingService = async (
    bookingId: string,
    companyId: string
): Promise<StandardResponseInterface<BookingInterface | null>> => {
    try {
        bookingLogger.info('Reading booking - service', {
            booking_id: bookingId,
            company_id: companyId
        });
        
        // Fetch booking from database
        const result = await readBookingDAO(bookingId, companyId);
        
        if (!result.success) {
            const status = 500;
            return {
                success: false,
                message: 'BOOKING_FETCH_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to fetch booking' }],
            };
        }
        
        if (!result.booking) {
            const status = 404;
            return {
                success: false,
                message: 'BOOKING_NOT_FOUND',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'booking_id', message: 'Booking not found' }],
            };
        }
        
        bookingLogger.info('Booking fetched successfully', {
            booking_id: bookingId,
            booking_number: result.booking.booking_number
        });
        
        const status = 200;
        return {
            success: true,
            message: 'BOOKING_FETCHED_SUCCESSFULLY',
            status,
            code: 'SUCCESS',
            data: result.booking,
            errors: [],
        };
        
    } catch (error) {
        bookingLogger.error('Error in read booking service', error);
        
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
