// src/features/bookings/operations/reschedule/service/Reschedule_Booking_Service.ts
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { checkBookingExistByIdDAO } from '@/features/company/bookings/database/dao/Check_Booking_Exist_DAO';
import { readBookingDAO } from '@/features/company/bookings/operations/read/dao/Read_Booking_DAO';
import { checkStaffAvailability } from '@/features/company/bookings/operations/helpers/Check_Staff_Availability_Helper';
import { rescheduleBookingDAO } from '@/features/company/bookings/operations/reschedule/dao/Reschedule_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

interface RescheduleData {
    new_scheduled_date: Date;
    new_scheduled_time_start: string;
    new_scheduled_time_end?: string | null;
    reason?: string;
    notify_customer?: boolean;
    notify_staff?: boolean;
}

/**
 * Service: Reschedule booking
 * Business rules:
 * - Cannot reschedule cancelled or completed bookings
 * - Must check staff availability for new time
 * - May have rescheduling fee based on notice period
 */
export const rescheduleBookingService = async (
    bookingId: string,
    companyId: string,
    rescheduledBy: string,
    rescheduleData: RescheduleData
): Promise<StandardResponseInterface<BookingInterface | null>> => {
    try {
        bookingLogger.info('Rescheduling booking - service', {
            booking_id: bookingId,
            new_date: rescheduleData.new_scheduled_date,
            new_time: rescheduleData.new_scheduled_time_start
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
        
        // ========== STEP 2: Fetch current booking ==========
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
                message: 'CANNOT_RESCHEDULE_CANCELLED_BOOKING',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'status', message: 'Cannot reschedule cancelled booking' }],
            };
        }
        
        if (currentBooking.status === 'completed') {
            const status = 400;
            return {
                success: false,
                message: 'CANNOT_RESCHEDULE_COMPLETED_BOOKING',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'status', message: 'Cannot reschedule completed booking' }],
            };
        }
        
        // ========== STEP 4: Check staff availability (if staff assigned) ==========
        if (currentBooking.staff_id) {
            const isAvailable = await checkStaffAvailability(
                currentBooking.staff_id,
                rescheduleData.new_scheduled_date,
                rescheduleData.new_scheduled_time_start,
                rescheduleData.new_scheduled_time_end || rescheduleData.new_scheduled_time_start,
                bookingId // Exclude current booking
            );
            
            if (!isAvailable) {
                const status = 409;
                return {
                    success: false,
                    message: 'STAFF_NOT_AVAILABLE',
                    status,
                    code: getErrorStatus(status),
                    data: null,
                    errors: [{ 
                        field: 'new_scheduled_date', 
                        message: 'Assigned staff is not available at the new time' 
                    }],
                };
            }
        }
        
        // ========== STEP 5: Check rescheduling policy ==========
        const currentDateTime = new Date(
            `${currentBooking.scheduled_date}T${currentBooking.scheduled_time_start}`
        );
        const hoursUntilBooking = (currentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
        
        // Example: Require 12 hours notice for rescheduling
        const minimumRescheduleHours = 12;
        
        if (hoursUntilBooking < minimumRescheduleHours && hoursUntilBooking > 0) {
            bookingLogger.warn('Late rescheduling attempt', {
                booking_id: bookingId,
                hours_until_booking: hoursUntilBooking,
                minimum_hours: minimumRescheduleHours
            });
            
            // In production, you might want to:
            // - Apply a rescheduling fee
            // - Require manager approval
            // - Send a warning notification
        }
        
        // ========== STEP 6: Reschedule booking in database ==========
        const rescheduleResult = await rescheduleBookingDAO(
            bookingId,
            companyId,
            rescheduleData
        );
        
        if (!rescheduleResult.success || !rescheduleResult.booking) {
            const status = 500;
            return {
                success: false,
                message: 'BOOKING_RESCHEDULE_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to reschedule booking' }],
            };
        }
        
        // ========== STEP 7: Handle notifications ==========
        if (rescheduleData.notify_customer || rescheduleData.notify_staff) {
            // TODO: Implement notification logic
            bookingLogger.info('Reschedule notifications triggered', {
                booking_id: bookingId,
                old_date: currentBooking.scheduled_date,
                new_date: rescheduleData.new_scheduled_date
            });
        }
        
        bookingLogger.info('Booking rescheduled successfully', {
            booking_id: bookingId,
            booking_number: rescheduleResult.booking.booking_number
        });
        
        const status = 200;
        return {
            success: true,
            message: 'BOOKING_RESCHEDULED_SUCCESSFULLY',
            status,
            code: getErrorStatus(status),
            data: rescheduleResult.booking,
            errors: [],
        };
        
    } catch (error) {
        bookingLogger.error('Error in reschedule booking service', error);
        
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
