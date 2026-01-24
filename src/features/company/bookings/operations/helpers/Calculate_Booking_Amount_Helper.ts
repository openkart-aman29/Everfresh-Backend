// src/features/bookings/operations/helpers/Calculate_Booking_Amount_Helper.ts

interface CalculateAmountInput {
    servicePrice: number;
    quantity: number;
    addonsTotal: number;
    discountAmount: number;
    taxRate: number; // e.g., 0.05 for 5%
}

interface CalculateAmountOutput {
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
}

/**
 * Helper: Calculate booking amounts
 * Formula: 
 * - subtotal = (servicePrice * quantity) + addonsTotal - discountAmount
 * - taxAmount = subtotal * taxRate
 * - totalAmount = subtotal + taxAmount
 */
export function calculateBookingAmount(
    input: CalculateAmountInput
): CalculateAmountOutput {
    const { servicePrice, quantity, addonsTotal, discountAmount, taxRate } = input;
    
    // Calculate subtotal
    const subtotal = (servicePrice * quantity) + addonsTotal - discountAmount;
    
    // Ensure subtotal is not negative
    const validSubtotal = Math.max(0, subtotal);
    
    // Calculate tax
    const taxAmount = validSubtotal * taxRate;
    
    // Calculate total
    const totalAmount = validSubtotal + taxAmount;
    
    // Round to 2 decimal places
    return {
        subtotal: Math.round(validSubtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100
    };
}
