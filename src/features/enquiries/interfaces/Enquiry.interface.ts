// src/features/enquiries/interfaces/Enquiry.interface.ts

export type EnquiryStatus = 'new' | 'contacted' | 'converted' | 'closed';

/** Payload accepted from the public website form. */
export interface CreateEnquiryRequest {
    full_name: string;
    email: string;
    phone: string;
    service_id?: string | null;
    service_name?: string | null;
    message?: string | null;
    preferred_date?: string | null;
    preferred_time?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location_accuracy?: number | null;
}

/** Request metadata captured server-side, never trusted from the client. */
export interface EnquiryRequestContext {
    ip_address: string | null;
    user_agent: string | null;
}

export interface EnquiryRecord {
    enquiry_id: string;
    company_id: string;
    full_name: string;
    email: string;
    phone: string;
    service_id: string | null;
    service_name: string | null;
    message: string | null;
    preferred_date: string | null;
    preferred_time: string | null;
    latitude: number | null;
    longitude: number | null;
    location_accuracy: number | null;
    /** Reverse-geocoded label, or null when it could not be resolved. */
    resolved_address: string | null;
    geocoded_at: string | null;
    status: EnquiryStatus;
    booking_id: string | null;
    handled_by: string | null;
    admin_notes: string | null;
    source: string;
    created_at: string;
    updated_at: string;
}

/**
 * What the public endpoint returns. Deliberately minimal - an unauthenticated
 * caller gets an acknowledgement, not the stored row.
 */
export interface CreateEnquiryResponse {
    enquiry_id: string;
    status: EnquiryStatus;
    created_at: string;
}

export interface ReadAllEnquiriesResult {
    enquiries: EnquiryRecord[];
    total: number;
    page: number;
    limit: number;
}
