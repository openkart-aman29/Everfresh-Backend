/**
 * Data Transfer Objects (DTOs) for Booking Operations
 * Used for API requests and responses
 */

export interface CreateBookingDTO {
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
}

export interface UpdateBookingDTO {
  scheduled_date?: Date;
  scheduled_time_start?: string;
  scheduled_time_end?: string | null;
  service_location?: string;
  staff_id?: string | null;
  special_instructions?: string | null;
}

export interface CancelBookingDTO {
  cancellation_reason: string;
  cancelled_by: string;
}

export interface RescheduleBookingDTO {
  new_scheduled_date: Date;
  new_scheduled_time_start: string;
  new_scheduled_time_end?: string | null;
  reason?: string;
}

export interface AssignStaffDTO {
  staff_id: string;
  assigned_by: string;
}

export interface UpdateStatusDTO {
  status: string;
  updated_by: string;
  reason?: string;
}

export interface AddAddonDTO {
  addon_id: string;
  added_by: string;
}
