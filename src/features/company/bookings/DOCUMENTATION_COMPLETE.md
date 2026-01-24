# Bookings Module — Detailed Documentation

## Overview

The bookings module manages the full lifecycle of service bookings for a company: creation, scheduling, staff assignment, status updates, cancellations, rescheduling, addons and soft-deletion. It follows a layered pattern: HTTP Router → Controller → Service → DAO → Database, with Zod for validation and Winston-based logging for observability.

## Purpose of this document

This file maps the implementation files, explains responsibilities for each component, and describes the data and control flow so developers can understand and extend the module confidently.

## File map (key files)

- `src/features/company/bookings/README.md` — high-level module README and API contract.
- `src/features/company/bookings/DOCUMENTATION_COMPLETE.md` — this detailed file.
- `src/features/company/bookings/router/Booking_Router.ts` — Express-like router exposing endpoints.
- `src/features/company/bookings/zod_schema/Booking_Zod_Schema.ts` — main booking Zod schemas and shared types.
- `src/features/company/bookings/interface/Booking_Interface.ts` — TypeScript interfaces for Booking records.
- `src/features/company/bookings/interface/Booking_DTO_Interface.ts` — DTOs used across controllers/services.
- `src/features/company/bookings/interface/Booking_Filter_Interface.ts` — filter/pagination interfaces.

Operations (each operation typically has `controller`, `service`, `dao`, `zod_schema` where applicable):
- `operations/update/controller/Update_Booking_Controller.ts`
- `operations/update/service/Update_Booking_Service.ts`
- `operations/update/dao/Update_Booking_DAO.ts`
- `operations/update/zod_schema/Update_Booking_Zod_Schema.ts`

- `operations/update_status/controller/Update_Status_Controller.ts`
- `operations/update_status/service/Update_Status_Service.ts`
- `operations/update_status/dao/Update_Status_DAO.ts`
- `operations/update_status/zod_schema/Update_Status_Zod_Schema.ts`

- `operations/read/service/Read_Booking_Service.ts`
- `operations/delete/service/Delete_Booking_Service.ts`
- `operations/assign_staff/zod_schema/Assign_Staff_Zod_Schema.ts`

Helpers:
- `operations/helpers/Validate_Booking_Time_Helper.ts`
- `operations/helpers/Check_Staff_Availability_Helper.ts`
- `operations/helpers/Calculate_Booking_Amount_Helper.ts`

Other supporting files and locations are referenced inline below via links to their respective paths.

## High-level Architecture & Request Flow

1. Incoming HTTP request arrives at the `Booking_Router` endpoint (for example, `POST /api/bookings/create`).
2. Router delegates to a controller function which:
   - Validates the request payload using a Zod schema from `zod_schema` (e.g. `Update_Booking_Zod_Schema`).
   - Extracts `company_id` and user context (multi-tenancy enforcement).
   - Calls the appropriate method on the corresponding `service` (business logic layer).
3. The `service` performs orchestration and business rules:
   - Calls helper utilities (time validation, staff availability, price calculation).
   - Applies transactional logic where necessary.
   - Calls `DAO` methods for DB read/write operations.
4. `DAO` methods interact with PostgreSQL via a shared `pg.Pool` connection (pool is injected or imported from the app-level DB manager). DAOs perform prepared queries, mapping DB rows to `Booking_Interface` shapes.
5. Services capture outcomes and either return success objects or throw structured errors that controllers map to HTTP responses.
6. Controllers log key events (info, warn, error) via the module logger and return standardized responses.

Sequence example (Update booking):

`HTTP PATCH /api/bookings/update/:booking_id` → `Update_Booking_Controller` → validate with `Update_Booking_Zod_Schema` → `Update_Booking_Service` → `Validate_Booking_Time_Helper` & `Check_Staff_Availability_Helper` → `Update_Booking_DAO` (DB update) → return result → controller logs and responds.

## Database Interface and DAO patterns

- DAOs are small, focused modules that encapsulate SQL queries and return typed rows. Example DAO responsibilities:
  - `findById(booking_id, company_id)` — get booking ensuring company-scoping.
  - `updateBooking(booking_id, patch, pool)` — perform parameterized `UPDATE` and return updated row.
  - `softDelete(booking_id, deleted_by)` — set `deleted_at` timestamp.
- DAOs should not implement business rules (availability, price calculation). They only validate SQL-level constraints and ensure safe parameterization.
- All DB access is expected to use the centralized connection manager: see the app-level `Database_Connection_Manager.ts` (project root) which provides `pg.Pool` instances.

## Validation (Zod schemas)

- `Booking_Zod_Schema.ts` contains shared validators (ULID format, time/date formats, base booking fields).
- Operation-specific schemas enforce required/optional fields, e.g. `Update_Booking_Zod_Schema.ts` allows patchable fields and validates `scheduled_time_start/end` pairs.
- Controllers always run `parse()`/`safeParse()` and return `400` on validation failures with clear messages.

## Logger

- The module uses the centralized logger configuration (Winston) with per-module loggers. Log files are written under `logs/{DATE}/Bookings/`.
- Controllers log incoming requests and important status changes (assignment, status update, cancellation). Services and DAOs log error contexts (SQL errors, unexpected states).
- Log levels:
  - `info`: successful operations (create/read/update)
  - `warn`: recoverable edge cases (no staff available)
  - `error`: DB or runtime errors

## Helpers and Utilities

- `Validate_Booking_Time_Helper.ts` — verifies time format, minimum duration rules, business hours, and that `start < end`.
- `Check_Staff_Availability_Helper.ts` — queries bookings to detect overlapping assignments for a staff member; used before assigning staff or confirming bookings.
- `Calculate_Booking_Amount_Helper.ts` — sums service price, addon snapshot prices, tax, and applies discounts to produce `subtotal` and `total_amount`.

## Operations (detailed)

Each operation follows the same Controller→Service→DAO pattern. Below are responsibilities and typical function names.

- Create booking
  - Controller: validates payload (main `Booking_Zod_Schema`) and user context.
  - Service: generate `booking_id`/`booking_number` (ULID), calculate amounts, check staff availability if `staff_id` supplied, persist booking and booking_addons in a transaction via DAO.
  - DAO: insert `bookings` row and insert addon snapshots into `booking_addons`.

- Read booking(s)
  - Service: supports single read (`booking_id`) and filtered queries (pagination, status, staff, customer).
  - DAO: `findById`, `findAll(filters, limit, offset)`.

- Update booking
  - Controller: accepts patch fields; validates with `Update_Booking_Zod_Schema`.
  - Service: validate times, check conflicts, recalculate amounts if necessary, call `Update_Booking_DAO`.
  - DAO: perform `UPDATE` and return updated row.

- Update status
  - Controller: `Update_Status_Zod_Schema` ensures `status` enum and `reason`.
  - Service: enforce allowed status transitions (e.g., cannot move from `completed` to `confirmed`), optionally trigger notifications, persist audit fields.
  - DAO: update `status`, `updated_at` and record `cancelled_at` when applicable.

- Assign staff
  - Controller: accepts `staff_id` via `Assign_Staff_Zod_Schema`.
  - Service: checks staff availability and assigns staff by calling DAO.

- Cancel / Reschedule
  - Services set `status = cancelled/rescheduled`, record `cancellation_reason` or `reschedule_reason`, update timestamps, and optionally free staff assignments.

- Delete (soft)
  - Service calls DAO to set `deleted_at` and leaves historical data intact.

## How files are connected (practical mapping)

- Router → Controller: `src/features/company/bookings/router/Booking_Router.ts` wires routes to controller functions.
- Controller → Zod: controllers import Zod schemas from `src/features/company/bookings/zod_schema/*` to validate incoming payloads.
- Controller → Service: controllers call service methods in `operations/*/service/*`.
- Service → Helpers: services import helpers from `operations/helpers` for business validations and calculations.
- Service → DAO: services call `operations/*/dao/*` for DB operations.
- DAO → Database: DAOs use the global connection from `src/database/Database_Connection_Manager.ts`.

Example mapping for update-status flow:

- Route: `[PATCH] /api/bookings/update-status/:booking_id`
- Router: `Booking_Router` delegates to `Update_Status_Controller.updateStatus()`
- Controller: validates with `Update_Status_Zod_Schema`, calls `Update_Status_Service.updateStatus()`
- Service: enforces transition rules, calls `Update_Status_DAO.updateStatus()` → DAO runs SQL `UPDATE bookings SET status = $1,... WHERE booking_id = $2 AND company_id = $3`

## Sample usage (instantiating router)

Import and mount the router in the application bootstrap:

```ts
import BookingRouter from 'src/features/company/bookings/router/Booking_Router';
// assuming BookingRouter exports a factory that accepts a DB pool
app.use('/api/bookings', BookingRouter.getRouter());
```

## Common errors and troubleshooting

- Validation errors: returned with `400` and Zod messages — check schema in `zod_schema`.
- Conflicting bookings: handled by `Check_Staff_Availability_Helper` — investigate queries that DAO uses for overlap checks.
- Partial failures in multi-step operations: ensure services use DB transactions when inserting booking and addons.

## Tests & Extensibility

- Unit test targets:
  - Helpers (`Validate_Booking_Time_Helper`, `Calculate_Booking_Amount_Helper`).
  - Service rules (status transitions, availability checks).
  - DAO queries (integration tests against a test Postgres instance).
- To add a new operation (e.g., recurring bookings): add `operations/recurring/{controller,service,dao,zod_schema}` and wire its route in `Booking_Router`.

## References (key files)

- Router: [src/features/company/bookings/router/Booking_Router.ts](src/features/company/bookings/router/Booking_Router.ts)
- Top-level schema: [src/features/company/bookings/zod_schema/Booking_Zod_Schema.ts](src/features/company/bookings/zod_schema/Booking_Zod_Schema.ts)
- Interfaces: [src/features/company/bookings/interface/Booking_Interface.ts](src/features/company/bookings/interface/Booking_Interface.ts)
- Update flow controller/service/dao:
  - [src/features/company/bookings/operations/update/controller/Update_Booking_Controller.ts](src/features/company/bookings/operations/update/controller/Update_Booking_Controller.ts)
  - [src/features/company/bookings/operations/update/service/Update_Booking_Service.ts](src/features/company/bookings/operations/update/service/Update_Booking_Service.ts)
  - [src/features/company/bookings/operations/update/dao/Update_Booking_DAO.ts](src/features/company/bookings/operations/update/dao/Update_Booking_DAO.ts)

If you want, I can also:
- Run a quick static scan of the listed files and extract exact function signatures.
- Generate a PlantUML or mermaid diagram showing the request flow.

---
Document created on 2026-01-14.
