// src/features/staff/interfaces/Staff_Assigned_Bookings.interface.ts

export interface BookingStatus {
    code: string;
    name: string;
    isTerminal: boolean;
    allowedTransitions: string[];
    color: string;
}

export interface CustomerInfo {
    customerId: string;
    name: string;
    phone: string;
}

export interface AssignedBooking {
    bookingId: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    serviceName: string;
    customer: CustomerInfo;
    status: BookingStatus;
}

export interface AssignedBookingsResponse {
    data: AssignedBooking[];
    pagination: {
        page: number;
        limit: number;
        totalRecords: number;
        totalPages: number;
    };
}