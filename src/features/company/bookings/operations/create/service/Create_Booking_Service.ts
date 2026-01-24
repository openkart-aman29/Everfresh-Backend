import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';
import { checkCustomerExistDAO } from '@/features/customers/database/dao/Check_Customer_Exist_DAO';
import { checkServiceExistDAO } from '@/features/services/database/dao/Check_Service_Exist_DAO';
import { checkStaffExistDAO } from '@/features/staff/database/dao/Check_Staff_Exist_DAO';
import { getServiceByIdDAO } from '@/features/services/database/dao/Get_Service_DAO';
import { getAddonsDAO } from '@/features/services/database/dao/Get_Addons_DAO';
import { createBookingDAO } from '@/features/company/bookings/operations/create/dao/Create_Booking_DAO';
import { createBookingAddonsDAO } from '@/features/company/bookings/operations/create/dao/Create_Booking_Addons_DAO';
import { calculateBookingAmount } from '@/features/company/bookings/operations/helpers/Calculate_Booking_Amount_Helper';
import { checkStaffAvailability } from '@/features/company/bookings/operations/helpers/Check_Staff_Availability_Helper';

interface CreateBookingInput {
    company_id: string;
    customer_id: string;
    service_id: string;
    staff_id?: string | null;
    scheduled_date: Date;
    scheduled_time_start: string;
    scheduled_time_end?: string | null;
    service_location: string;
    quantity?: number;
    addon_ids?: string[];
    discount_amount?: number;
    special_instructions?: string | null;
    created_by: string;
}

/**
 * Service: Create new booking
 * Business logic and orchestration layer
 */
export const createBookingService = async (
    inputData: CreateBookingInput
): Promise<StandardResponseInterface<BookingInterface | null>> => {
    try {
        bookingLogger.info('Creating booking - service', {
            customer_id: inputData.customer_id,
            service_id: inputData.service_id,
            scheduled_date: inputData.scheduled_date,
            staff_id: inputData.staff_id || 'unassigned'
        });
        
        // ========== STEP 1: Validate Customer ==========
        const customerExists = await checkCustomerExistDAO(
            inputData.customer_id,
            inputData.company_id
        );
        
        if (!customerExists.exists) {
            const status = 404;
            return {
                success: false,
                message: 'CUSTOMER_NOT_FOUND',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'customer_id', message: 'Customer not found' }],
            };
        }
        
        // ========== STEP 2: Validate Service ==========
        const serviceExists = await checkServiceExistDAO(
            inputData.service_id,
            inputData.company_id
        );
        
        if (!serviceExists.exists) {
            const status = 404;
            return {
                success: false,
                message: 'SERVICE_NOT_FOUND',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'service_id', message: 'Service not found' }],
            };
        }
        
        // Get service details for pricing
        const serviceResult = await getServiceByIdDAO(
            inputData.service_id,
            inputData.company_id
        );
        
        if (!serviceResult.success || !serviceResult.service) {
            const status = 500;
            return {
                success: false,
                message: 'SERVICE_FETCH_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'service_id', message: 'Failed to fetch service details' }],
            };
        }
        
        const service = serviceResult.service;
        
        // Check if service requires quote
        if (service.requires_quote) {
            const status = 400;
            return {
                success: false,
                message: 'SERVICE_REQUIRES_QUOTE',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'service_id', message: 'This service requires a manual quote' }],
            };
        }
        
        // ========== STEP 3: Validate Staff (ONLY IF PROVIDED) ==========
        // 🔥 KEY CHANGE: Only validate staff if staff_id is explicitly provided
        if (inputData.staff_id && inputData.staff_id.trim() !== '') {
            bookingLogger.info('Staff assignment requested, validating staff', {
                staff_id: inputData.staff_id
            });
            
            // Check if staff exists and belongs to company
            const staffExists = await checkStaffExistDAO(
                inputData.staff_id,
                inputData.company_id
            );
            
            if (!staffExists.exists) {
                const status = 404;
                return {
                    success: false,
                    message: 'STAFF_NOT_FOUND',
                    status,
                    code: getErrorStatus(status),
                    data: null,
                    errors: [{ field: 'staff_id', message: 'Staff not found or unavailable' }],
                };
            }
            
            // Check staff availability for the scheduled time
            const endTime = inputData.scheduled_time_end || inputData.scheduled_time_start;
            
            const isAvailable = await checkStaffAvailability(
                inputData.staff_id,
                inputData.scheduled_date,
                inputData.scheduled_time_start,
                endTime
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
                        message: 'Staff already has a booking during this time slot' 
                    }],
                };
            }
            
            bookingLogger.info('Staff availability confirmed', {
                staff_id: inputData.staff_id,
                scheduled_date: inputData.scheduled_date,
                time_slot: `${inputData.scheduled_time_start} - ${endTime}`
            });
        } else {
            bookingLogger.info('Booking created without staff assignment - will be assigned later');
        }
        
        // ========== STEP 4: Fetch Addons (if provided) ==========
        let addons: any[] = [];
        let addonsTotal = 0;
        
        if (inputData.addon_ids && inputData.addon_ids.length > 0) {
            const addonsResult = await getAddonsDAO(
                inputData.addon_ids,
                inputData.company_id
            );
            
            if (addonsResult.success && addonsResult.addons) {
                addons = addonsResult.addons;
                addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
            } else {
                bookingLogger.warn('Some addons could not be fetched', {
                    requested_ids: inputData.addon_ids
                });
            }
        }
        
        // ========== STEP 5: Calculate Pricing ==========
        const quantity = inputData.quantity || 1;
        const servicePrice = service.price;
        
        const {
            subtotal,
            taxAmount,
            totalAmount
        } = calculateBookingAmount({
            servicePrice,
            quantity,
            addonsTotal,
            discountAmount: inputData.discount_amount || 0,
            taxRate: 0.05 // 5% VAT (fetch from company settings in real implementation)
        });
        
        bookingLogger.info('Booking pricing calculated', {
            service_price: servicePrice,
            quantity,
            addons_total: addonsTotal,
            discount: inputData.discount_amount || 0,
            tax: taxAmount,
            total: totalAmount
        });
        
        // ========== STEP 6: Generate Booking ID ==========
        const bookingId = generateULID();
        
        // ========== STEP 7: Prepare Booking Data ==========
        const bookingData: BookingInterface = {
            booking_id: bookingId,
            booking_number: '', // Will be generated by database trigger
            company_id: inputData.company_id,
            customer_id: inputData.customer_id,
            service_id: inputData.service_id,
            staff_id: inputData.staff_id || null, // 🔥 NULL if not provided
            status: 'pending',
            scheduled_date: inputData.scheduled_date,
            scheduled_time_start: inputData.scheduled_time_start,
            scheduled_time_end: inputData.scheduled_time_end || null,
            service_location: inputData.service_location,
            quantity,
            service_price: servicePrice,
            addons_total: addonsTotal,
            subtotal,
            discount_amount: inputData.discount_amount || 0,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            special_instructions: inputData.special_instructions || null,
            cancellation_reason: null,
            cancelled_by: null,
            cancelled_at: null,
            created_by: inputData.created_by,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null
        };
        
        // ========== STEP 8: Create Booking in Database ==========
        const createResult = await createBookingDAO(bookingData);
        
        if (!createResult.success || !createResult.booking) {
            const status = 500;
            return {
                success: false,
                message: 'BOOKING_CREATION_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to create booking in database' }],
            };
        }
        
        // ========== STEP 9: Create Booking Addons (if any) ==========
        if (addons.length > 0) {
            const addonsCreated = await createBookingAddonsDAO(bookingId, addons);
            
            if (!addonsCreated) {
                bookingLogger.warn('Failed to create some booking addons', {
                    booking_id: bookingId
                });
            }
        }
        
        // ========== STEP 10: Success Response ==========
        bookingLogger.info('Booking created successfully', {
            booking_id: bookingId,
            booking_number: createResult.booking.booking_number,
            total_amount: totalAmount,
            staff_assigned: !!inputData.staff_id
        });
        
        const status = 201;
        return {
            success: true,
            message: 'BOOKING_CREATED_SUCCESSFULLY',
            status,
            code: "SUCCESS",
            data: createResult.booking,
            errors: [],
        };
        
    } catch (error) {
        bookingLogger.error('Error in create booking service', error);
        
        const status = 500;
        return {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error during booking creation' }],
        };
    }
};