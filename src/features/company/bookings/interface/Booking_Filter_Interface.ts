/**
 * Filter and Pagination Interfaces for Booking Queries
 */

export interface BookingFiltersInterface {
  company_id: string;              // Required for multi-tenancy
  customer_id?: string;
  service_id?: string;
  staff_id?: string;
  status?: string | string[];
  scheduled_date_from?: Date;
  scheduled_date_to?: Date;
  search?: string;                 // Search by booking_number or customer name
  payment_status?: 'unpaid' | 'partial' | 'paid';
}

export interface PaginationInterface {
  page: number;                    // Starting from 1
  limit: number;                   // Items per page
  sort_by?: string;                // Field to sort by
  sort_order?: 'ASC' | 'DESC';
}

export interface BookingListResponseInterface {
  bookings: any[];                 // Array of BookingInterface
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
