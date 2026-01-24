// src/features/bookings/operations/cancel/service/Cancel_Booking_Service.ts
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { checkBookingExistByIdDAO } from '@/features/company/bookings/database/dao/Check_Booking_Exist_DAO';
import { readBookingDAO } from '@/features/company/bookings/operations/read/dao/Read_Booking_DAO';
import { cancelBookingDAO } from '@/features/company/bookings/operations/cancel/dao/Cancel_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

interface CancelData {
    cancellation_reason: string;
    notify_customer?: boolean;
    notify_staff?: boolean;
}

/**
 * Service: Cancel booking
 * Business rules:
 * - Cannot cancel already cancelled bookings
 * - Cannot cancel completed bookings
 * - May have cancellation fee logic (to be implemented)
 */
export const cancelBookingService = async (
    bookingId: string,
    companyId: string,
    cancelledBy: string,
    cancelData: CancelData
): Promise<StandardResponseInterface<BookingInterface | null>> => {
    try {
        bookingLogger.info('Cancelling booking - service', {
            booking_id: bookingId,
            company_id: companyId,
            cancelled_by: cancelledBy
        });
        
        // ========== STEP 1: Check if booking exists ==========
        const bookingExists = await checkBookingExistByIdDAO(bookingId, companyId);
        if (!bookingExists.exists) {
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
        
        // ========== STEP 2: Fetch current booking to check status ==========
        const bookingResult = await readBookingDAO(bookingId, companyId);
        if (!bookingResult.success || !bookingResult.booking) {
            const status = 500;
            return {
                success: false,
                message: 'BOOKING_FETCH_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to fetch booking details' }],
            };
        }
        
        const currentBooking = bookingResult.booking;
        
        // ========== STEP 3: Validate current status ==========
        if (currentBooking.status === 'cancelled') {
            const status = 400;
            return {
                success: false,
                message: 'BOOKING_ALREADY_CANCELLED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'status', message: 'Booking is already cancelled' }],
            };
        }
        
        if (currentBooking.status === 'completed') {
            const status = 400;
            return {
                success: false,
                message: 'CANNOT_CANCEL_COMPLETED_BOOKING',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'status', message: 'Cannot cancel completed booking' }],
            };
        }
        
        // ========== STEP 4: Business Rules - Cancellation Policy ==========
        // Check if cancellation is within allowed timeframe
        const scheduledDateTime = new Date(
            `${currentBooking.scheduled_date}T${currentBooking.scheduled_time_start}`
        );
        const hoursUntilBooking = (scheduledDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
        
        // Example: Require 24 hours notice for cancellation
        const minimumCancellationHours = 24;
        
        if (hoursUntilBooking < minimumCancellationHours && hoursUntilBooking > 0) {
            bookingLogger.warn('Late cancellation attempt', {
                booking_id: bookingId,
                hours_until_booking: hoursUntilBooking,
                minimum_hours: minimumCancellationHours
            });
            
            // You might want to allow cancellation but apply a fee
            // For now, we'll allow it but log a warning
            // In production, you'd check user permissions or apply cancellation fee
        }
        
        // ========== STEP 5: Cancel booking in database ==========
        const cancelResult = await cancelBookingDAO(
            bookingId,
            companyId,
            cancelledBy,
            cancelData.cancellation_reason
        );
        
        if (!cancelResult.success || !cancelResult.booking) {
            const status = 500;
            return {
                success: false,
                message: 'BOOKING_CANCELLATION_FAILED',
                status,
                code: "SUCCESS",
                data: null,
                errors: [{ field: 'database', message: 'Failed to cancel booking' }],
            };
        }
        
        // ========== STEP 6: Handle notifications ==========
        if (cancelData.notify_customer || cancelData.notify_staff) {
            // TODO: Implement notification logic
            // - Send email/SMS to customer
            // - Notify assigned staff
            // - Log communication
            bookingLogger.info('Notifications triggered', {
                booking_id: bookingId,
                notify_customer: cancelData.notify_customer,
                notify_staff: cancelData.notify_staff
            });
        }
        
        // ========== STEP 7: Handle refunds (if applicable) ==========
        // TODO: Check if booking was paid and initiate refund process
        // This would involve:
        // - Check payment status
        // - Calculate refund amount based on cancellation policy
        // - Create refund payment record
        // - Process refund through payment gateway
        
        bookingLogger.info('Booking cancelled successfully', {
            booking_id: bookingId,
            booking_number: cancelResult.booking.booking_number
        });
        
        const status = 200;
        return {
            success: true,
            message: 'BOOKING_CANCELLED_SUCCESSFULLY',
            status,
            code: getErrorStatus(status),
            data: cancelResult.booking,
            errors: [],
        };
        
    } catch (error) {
        bookingLogger.error('Error in cancel booking service', error);
        
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
