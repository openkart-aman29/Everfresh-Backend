// src/features/bookings/operations/helpers/Validate_Booking_Time_Helper.ts

/**
 * Helper: Validate booking time constraints
 */
export function validateBookingTime(
    scheduledDate: Date,
    scheduledTimeStart: string,
    minAdvanceHours: number = 24,
    maxAdvanceDays: number = 90
): { valid: boolean; error?: string } {
    try {
        // Combine date and time
        const bookingDateTime = new Date(`${scheduledDate.toISOString().split('T')[0]}T${scheduledTimeStart}`);
        const now = new Date();
        
        // Calculate hours until booking
        const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Check minimum advance notice
        if (hoursUntilBooking < minAdvanceHours) {
            return {
                valid: false,
                error: `Booking must be at least ${minAdvanceHours} hours in advance`
            };
        }
        
        // Calculate days until booking
        const daysUntilBooking = hoursUntilBooking / 24;
        
        // Check maximum advance booking
        if (daysUntilBooking > maxAdvanceDays) {
            return {
                valid: false,
                error: `Cannot book more than ${maxAdvanceDays} days in advance`
            };
        }
        
        return { valid: true };
        
    } catch (error) {
        return {
            valid: false,
            error: 'Invalid date/time format'
        };
    }
}

/**
 * Helper: Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
}

/**
 * Helper: Check if end time is after start time
 */
export function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
        return false;
    }
    
    return endTime > startTime;
}
