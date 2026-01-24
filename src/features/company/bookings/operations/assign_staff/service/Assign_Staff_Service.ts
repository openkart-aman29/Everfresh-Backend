// src/features/bookings/operations/assign_staff/service/Assign_Staff_Service.ts
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { checkBookingExistByIdDAO } from '@/features/company/bookings/database/dao/Check_Booking_Exist_DAO';
import { checkStaffExistDAO } from '@/features/staff/database/dao/Check_Staff_Exist_DAO';
import { readBookingDAO } from '@/features/company/bookings/operations/read/dao/Read_Booking_DAO';
import { checkStaffAvailability } from '@/features/company/bookings/operations/helpers/Check_Staff_Availability_Helper';
import { assignStaffDAO } from '@/features/company/bookings/operations/assign_staff/dao/Assign_Staff_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

interface AssignStaffData {
    staff_id: string;
    notify_staff?: boolean;
    notify_customer?: boolean;
    notes?: string;
}

/**
 * Service: Assign staff to booking
 */
export const assignStaffService = async (
    bookingId: string,
    companyId: string,
    assignedBy: string,
    assignData: AssignStaffData
): Promise<StandardResponseInterface<BookingInterface | null>> => {
    try {
        bookingLogger.info('Assigning staff - service', {
            booking_id: bookingId,
            staff_id: assignData.staff_id,
            assigned_by: assignedBy
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
        
        // ========== STEP 2: Check if staff exists ==========
        const staffExists = await checkStaffExistDAO(assignData.staff_id, companyId);
        if (!staffExists.exists) {
            const status = 404;
            return {
                success: false,
                message: 'STAFF_NOT_FOUND',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'staff_id', message: 'Staff not found' }],
            };
        }
        
        // ========== STEP 3: Fetch current booking ==========
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
        
        // ========== STEP 4: Validate booking status ==========
        if (currentBooking.status === 'cancelled') {
            const status = 400;
            return {
                success: false,
                message: 'CANNOT_ASSIGN_STAFF_TO_CANCELLED_BOOKING',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'status', message: 'Cannot assign staff to cancelled booking' }],
            };
        }
        
        if (currentBooking.status === 'completed') {
            const status = 400;
            return {
                success: false,
                message: 'CANNOT_ASSIGN_STAFF_TO_COMPLETED_BOOKING',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'status', message: 'Cannot assign staff to completed booking' }],
            };
        }
        
        // ========== STEP 5: Check staff availability ==========
        const isAvailable = await checkStaffAvailability(
            assignData.staff_id,
            new Date(currentBooking.scheduled_date),
            currentBooking.scheduled_time_start,
            currentBooking.scheduled_time_end || currentBooking.scheduled_time_start,
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
                    field: 'staff_id', 
                    message: 'Staff already has a booking at this time' 
                }],
            };
        }
        
        // ========== STEP 6: Assign staff in database ==========
        const assignResult = await assignStaffDAO(
            bookingId,
            companyId,
            assignData.staff_id
        );
        
        if (!assignResult.success || !assignResult.booking) {
            const status = 500;
            return {
                success: false,
                message: 'STAFF_ASSIGNMENT_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to assign staff' }],
            };
        }
        
        // ========== STEP 7: Handle notifications ==========
        if (assignData.notify_staff || assignData.notify_customer) {
            // TODO: Implement notification logic
            bookingLogger.info('Staff assignment notifications triggered', {
                booking_id: bookingId,
                staff_id: assignData.staff_id
            });
        }
        
        bookingLogger.info('Staff assigned successfully', {
            booking_id: bookingId,
            staff_id: assignData.staff_id
        });
        
        const status = 200;
        return {
            success: true,
            message: 'STAFF_ASSIGNED_SUCCESSFULLY',
            status,
            code: 'SUCCESS',
            data: assignResult.booking,
            errors: [],
        };
        
    } catch (error) {
        bookingLogger.error('Error in assign staff service', error);
        
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
