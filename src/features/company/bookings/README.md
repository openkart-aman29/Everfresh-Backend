# Booking Module Documentation

## Module Overview

The Booking module manages the complete lifecycle of service bookings in the EverFresh multi-tenant cleaning service system. It handles booking creation, scheduling, staff assignment, payment tracking, cancellations, and rescheduling with full audit trails.

## Architecture Pattern

The module follows a layered architecture:

```
Controller Layer (HTTP Request/Response + Validation)
    ↓
Service Layer (Business Logic + Orchestration)
    ↓
DAO Layer (Data Access Operations)
    ↓
PostgreSQL Database (pg.Pool)
```

## Technology Stack

- **Database**: PostgreSQL 15+ with pg driver (connection pooling)
- **Validation**: Zod schemas
- **ID Generation**: ULID (26 characters)
- **Logging**: Winston with daily rotation
- **Type Safety**: TypeScript 5.8+
- **Response Format**: Standardized response interface

## Folder Structure

```
src/modules/bookings/
├── README.md
├── database/
│   └── dao/
│       ├── Base_Booking_DAO.ts
│       └── Check_Booking_Exist_DAO.ts
├── interface/
│   ├── Booking_Interface.ts
│   ├── Booking_DTO_Interface.ts
│   └── Booking_Filter_Interface.ts
├── logger/
│   └── Booking_Logger.ts
├── operations/
│   ├── create/
│   ├── read/
│   ├── read_all/
│   ├── update/
│   ├── delete/
│   ├── cancel/
│   ├── reschedule/
│   ├── assign_staff/
│   ├── update_status/
│   ├── add_addon/
│   └── helpers/
├── router/
│   └── Booking_Router.ts
└── zod_schema/
    └── Booking_Zod_Schema.ts
```

## API Endpoints

### Create Booking
**POST** `/api/bookings/create`

Creates a new booking with service details.

**Request Body:**
```json
{
  "company_id": "ulid_26_chars",
  "customer_id": "ulid_26_chars",
  "service_id": "ulid_26_chars",
  "staff_id": "ulid_26_chars or null",
  "scheduled_date": "2025-01-15",
  "scheduled_time_start": "10:00",
  "scheduled_time_end": "12:00",
  "service_location": "123 Main St, City, State",
  "quantity": 1,
  "addon_ids": ["addon_id_1", "addon_id_2"],
  "discount_amount": 0,
  "special_instructions": "Please ring doorbell twice"
}
```

### Get All Bookings
**GET** `/api/bookings/read-all`

Retrieves paginated list of bookings with filters.

**Query Parameters:**
```
page=1
limit=10
status=pending,confirmed
sort_by=created_at
sort_order=DESC
customer_id=optional
service_id=optional
staff_id=optional
```

### Get Single Booking
**GET** `/api/bookings/read/:booking_id`

Retrieves detailed information about a specific booking including addons.

### Update Booking
**PATCH** `/api/bookings/update/:booking_id`

Updates booking details (date, time, location, staff, instructions).

**Request Body:**
```json
{
  "scheduled_date": "2025-01-20",
  "scheduled_time_start": "14:00",
  "scheduled_time_end": "16:00",
  "service_location": "new location",
  "staff_id": "new_staff_id",
  "special_instructions": "updated instructions"
}
```

### Delete Booking (Soft Delete)
**DELETE** `/api/bookings/delete/:booking_id`

Soft deletes a booking (marks as deleted).

### Cancel Booking
**POST** `/api/bookings/cancel/:booking_id`

Cancels a booking with a reason.

**Request Body:**
```json
{
  "cancellation_reason": "Customer requested cancellation due to schedule conflict"
}
```

### Reschedule Booking
**POST** `/api/bookings/reschedule/:booking_id`

Reschedules a booking to a new date/time.

**Request Body:**
```json
{
  "new_scheduled_date": "2025-02-01",
  "new_scheduled_time_start": "09:00",
  "new_scheduled_time_end": "11:00",
  "reason": "Customer requested new time"
}
```

### Assign Staff
**PATCH** `/api/bookings/assign-staff/:booking_id`

Assigns a staff member to a booking.

**Request Body:**
```json
{
  "staff_id": "staff_member_ulid"
}
```

### Update Status
**PATCH** `/api/bookings/update-status/:booking_id`

Updates booking status (pending, confirmed, in_progress, completed, cancelled).

**Request Body:**
```json
{
  "status": "confirmed",
  "reason": "Customer confirmed the appointment"
}
```

### Add Addon
**POST** `/api/bookings/add-addon/:booking_id`

Adds an addon to an existing booking.

**Request Body:**
```json
{
  "addon_id": "addon_ulid",
  "addon_name": "Premium Cleaning",
  "price": 25.00
}
```

## Database Schema (Reference)

### bookings table
```sql
CREATE TABLE bookings (
  booking_id ULID PRIMARY KEY,
  booking_number VARCHAR(255) UNIQUE,
  company_id ULID NOT NULL,
  customer_id ULID NOT NULL,
  service_id ULID NOT NULL,
  staff_id ULID,
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  scheduled_time_start TIME NOT NULL,
  scheduled_time_end TIME,
  service_location VARCHAR(255),
  quantity INT DEFAULT 1,
  service_price DECIMAL(10,2),
  addons_total DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2),
  special_instructions TEXT,
  cancellation_reason TEXT,
  cancelled_by ULID,
  cancelled_at TIMESTAMP,
  created_by ULID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(company_id),
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (service_id) REFERENCES services(service_id)
);
```

### booking_addons table
```sql
CREATE TABLE booking_addons (
  booking_addon_id ULID PRIMARY KEY,
  booking_id ULID NOT NULL,
  addon_id ULID NOT NULL,
  addon_name VARCHAR(255),
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
);
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "status": "error",
  "code": 400,
  "message": "Error description"
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `404`: Not Found
- `500`: Internal Server Error

## Logging

All operations are logged with Winston logger:
- **Info**: Successful operations, booking retrieval
- **Error**: Database errors, validation failures
- **Warn**: Edge cases (booking not found, etc.)

Logs are stored in:
- `logs/{DATE}/Bookings/Bookings.log.{DATE}`
- `logs/{DATE}/Bookings/Bookings-error.log.{DATE}`

## Helper Functions

### Calculate Booking Amount
Calculates totals including service price, addons, discount, and tax.

### Validate Booking Time
Validates time formats, duration, and slot availability.

### Check Staff Availability
Verifies staff availability for given time slots and identifies conflicts.

## Usage Example

```typescript
import { BookingRouter } from '@/modules/bookings/router/Booking_Router';
import { Pool } from 'pg';

const pool = new Pool({ /* connection config */ });
const bookingRouter = new BookingRouter(pool);

// Use in Express app
app.use('/api/bookings', bookingRouter.getRouter());
```

## Notes

- All bookings are soft-deleted (marked with deleted_at timestamp)
- Company-scoped queries ensure multi-tenancy
- Addons are snapshots (stored price at time of booking)
- Status transitions: pending → confirmed → in_progress → completed
- Bookings can be cancelled at any point (except completed)
- Rescheduling changes status to 'rescheduled'

## Future Enhancements

- Audit trail table for all booking changes
- Notification system for booking status changes
- Calendar view integration
- Recurring booking support
- Payment integration
- Resource utilization reports
