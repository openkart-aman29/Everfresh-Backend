// src/features/bookings/operations/update_status/service/Update_Status_Service.ts
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { checkBookingExistByIdDAO } from '@/features/company/bookings/database/dao/Check_Booking_Exist_DAO';
import { readBookingDAO } from '@/features/company/bookings/operations/read/dao/Read_Booking_DAO';
import { updateStatusDAO } from '@/features/company/bookings/operations/update_status/dao/Update_Status_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

interface UpdateStatusData {
    status: string;
    reason?: string;
    actual_start_time?: Date;
    actual_end_time?: Date;
}

/**
 * Service: Update booking status
 * Handles status transitions with validation
 */
export const updateStatusService = async (
    bookingId: string,
    companyId: string,
    updatedBy: string,
    statusData: UpdateStatusData
): Promise<StandardResponseInterface<BookingInterface | null>> => {
    try {
        bookingLogger.info('Updating booking status - service', {
            booking_id: bookingId,
            new_status: statusData.status
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
        
        // ========== STEP 3: Validate status transition ==========
        // This is also validated by database trigger, but we check here for better error messages
        const validTransitions: Record<string, string[]> = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['in_progress', 'rescheduled', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            'rescheduled': ['confirmed', 'cancelled'],
            'completed': [], // Terminal state
            'cancelled': []  // Terminal state
        };
        
        const allowedStatuses = validTransitions[currentBooking.status] || [];
        
        if (!allowedStatuses.includes(statusData.status)) {
            const status = 400;
            return {
                success: false,
                message: 'INVALID_STATUS_TRANSITION',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ 
                    field: 'status', 
                    message: `Cannot transition from ${currentBooking.status} to ${statusData.status}` 
                }],
            };
        }
        
        // ========== STEP 4: Update status in database ==========
        const updateResult = await updateStatusDAO(
            bookingId,
            companyId,
            statusData
        );
        
        if (!updateResult.success || !updateResult.booking) {
            const status = 500;
            return {
                success: false,
                message: 'STATUS_UPDATE_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to update booking status' }],
            };
        }
        
        bookingLogger.info('Booking status updated successfully', {
            booking_id: bookingId,
            old_status: currentBooking.status,
            new_status: statusData.status
        });
        
        const status = 200;
        return {
            success: true,
            message: 'STATUS_UPDATED_SUCCESSFULLY',
            status,
            code: getErrorStatus(status),
            data: updateResult.booking,
            errors: [],
        };
        
    } catch (error) {
        bookingLogger.error('Error in update status service', error);
        
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
