/**
 * Filter and Pagination Interfaces for Booking Queries
 */

// export interface BookingFiltersInterface {
//   company_id: string;              // Required for multi-tenancy
//   customer_id?: string;
//   service_id?: string;
//   staff_id?: string;
//   status?: string | string[];
//   scheduled_date_from?: Date;
//   scheduled_date_to?: Date;
//   search?: string;                 // Search by booking_number or customer name
//   payment_status?: 'unpaid' | 'partial' | 'paid';
// }

// export interface PaginationInterface {
//   page: number;                    // Starting from 1
//   limit: number;                   // Items per page
//   sort_by?: string;                // Field to sort by
//   sort_order?: 'ASC' | 'DESC';
// }

// export interface BookingListResponseInterface {
//   bookings: any[];                 // Array of BookingInterface
//   total: number;
//   page: number;
//   limit: number;
//   total_pages: number;
// }

/**
 * Filter and Pagination Interfaces for Booking Queries
 */

export interface BookingFiltersInterface {
  company_id: string;              // Required for multi-tenancy
  customer_id?: string;
  service_id?: string;
  staff_id?: string;
  status?: string | string[];      // pending, confirmed, in_progress, completed, cancelled, rescheduled
  search?: string;                 // Search by booking_number or customer name
}

export interface PaginationInterface {
  page: number;                    // Starting from 1
  limit: number;                   // Items per page
  sort_by?: string;                // Field to sort by
  sort_order?: 'ASC' | 'DESC';
}

/**
 * Individual booking item in the list response
 */
export interface BookingListItem {
  booking_id: string;
  booking_number: string;
  status: string;
  scheduled_date: Date;
  scheduled_time_start: string;
  scheduled_time_end?: string | null;
  service_location: string;
  total_amount: number;
  special_instructions?: string | null;
  created_at: Date;
  
  // Customer info
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  
  // Service info
  service_name: string;
  service_category: string;
  
  // Staff info (can be null if unassigned)
  staff_name?: string | null;
}

/**
 * Paginated response for booking list
 */
export interface BookingListResponseInterface {
  bookings: BookingListItem[];     // Typed array instead of any[]
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

