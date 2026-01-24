/**
 * Core Booking Domain Model Interfaces
 * Defines the structure of booking entities and related data
 */

export interface BookingDataInterface {
  company_id: string;              // ULID
  customer_id: string;             // ULID
  service_id: string;              // ULID
  staff_id: string | null;         // ULID or null
  status: string;                  // pending, confirmed, in_progress, completed, cancelled
  scheduled_date: Date;
  scheduled_time_start: string;    // HH:MM format
  scheduled_time_end: string | null;
  service_location: string;
  quantity: number;
  service_price: number;
  addons_total: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  special_instructions: string | null;
}

export interface BookingInterface extends BookingDataInterface {
  booking_id: string;              // ULID (Primary Key)
  booking_number: string;          // Generated: EVERFRESH-BK-20250108-0001
  cancellation_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: Date | null;
  created_by: string;              // ULID of user who created
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface BookingAddonInterface {
  booking_addon_id: string;        // ULID
  booking_id: string;
  addon_id: string;
  addon_name: string;              // Snapshot
  price: number;                   // Snapshot
  created_at: Date;
}
