// src/features/bookings/operations/update/service/Update_Booking_Service.ts
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { checkBookingExistByIdDAO } from '@/features/company/bookings/database/dao/Check_Booking_Exist_DAO';
import { checkStaffExistDAO } from '@/features/staff/database/dao/Check_Staff_Exist_DAO';
import { checkStaffAvailability } from '@/features/company/bookings/operations/helpers/Check_Staff_Availability_Helper';
import { updateBookingDAO } from '@/features/company/bookings/operations/update/dao/Update_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

interface UpdateData {
    scheduled_date?: Date;
    scheduled_time_start?: string;
    scheduled_time_end?: string | null;
    service_location?: string;
    staff_id?: string | null;
    special_instructions?: string | null;
}

/**
 * Service: Update booking
 */
export const updateBookingService = async (
    bookingId: string,
    companyId: string,
    updateData: UpdateData
): Promise<StandardResponseInterface<BookingInterface | null>> => {
    try {
        bookingLogger.info('Updating booking - service', {
            booking_id: bookingId,
            company_id: companyId,
            updates: Object.keys(updateData)
        });
        
        // Check if booking exists
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
        
        // Validate staff if being updated
        if (updateData.staff_id !== undefined && updateData.staff_id !== null) {
            const staffExists = await checkStaffExistDAO(updateData.staff_id, companyId);
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
            
            // Check staff availability if date/time is being updated
            if (updateData.scheduled_date || updateData.scheduled_time_start) {
                // Need to fetch current booking to check availability
                // For now, simplified version
                const isAvailable = await checkStaffAvailability(
                    updateData.staff_id,
                    updateData.scheduled_date || new Date(), // Should fetch from DB
                    updateData.scheduled_time_start || '00:00',
                    updateData.scheduled_time_end || '23:59',
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
            }
        }
        
        // Update booking in database
        const updateResult = await updateBookingDAO(bookingId, companyId, updateData);
        
        if (!updateResult.success || !updateResult.booking) {
            const status = 500;
            return {
                success: false,
                message: 'BOOKING_UPDATE_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to update booking' }],
            };
        }
        
        bookingLogger.info('Booking updated successfully', {
            booking_id: bookingId
        });
        
        const status = 200;
        return {
            success: true,
            message: 'BOOKING_UPDATED_SUCCESSFULLY',
            status,
            code: getErrorStatus(status),
            data: updateResult.booking,
            errors: [],
        };
        
    } catch (error) {
        bookingLogger.error('Error in update booking service', error);
        
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
