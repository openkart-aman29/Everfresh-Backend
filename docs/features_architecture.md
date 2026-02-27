# Features Architecture (`src/features`)

The `src/features` directory encapsulates the core business logic of the EverFresh Backend. It represents the distinct domain models of the multi-tenant SaaS application.

## Domain Relationships overview

EverFresh is built on a multi-tenant model. The primary connective tissue between all features is the `Company`.

1.  **Companies**: The central tenant. Every Staff, Customer, Admin, Service, and Booking is owned by a specific `company_id`.
2.  **Super Admins**: Platform-level administrators that have a `null` company ID, allowing them to oversee all companies.
3.  **Admins**: Company-level administrators who manage staff, customers, and operations for their specific company.
4.  **Staff**: Employees of a company who are assigned to fulfill bookings.
5.  **Customers**: The end-users who request services from a company.
6.  **Services (and Addons)**: The distinct offerings a company provides.
7.  **Bookings**: The transactional entity that ties everything together. A Booking connects a Customer to a Service, and is assigned to a Staff member, all operating under a specific Company.

## Feature Modules

Each feature is built as a self-contained module with its own:
-   **Router**: Maps HTTP endpoints to controllers.
-   **Controllers**: Request validation and response formatting.
-   **Services**: Core business logic and orchestration.
-   **DAOs (Data Access Objects)**: Direct interaction with PostgreSQL.
-   **Zod Schemas**: Strict input validation.
-   **Interfaces**: Internal TypeScript types.

### 1. Bookings (`features/company/bookings/`)
The most complex feature in the system.
-   **Lifecycle**: Creation -> (Optional Auto-assignment) -> Staff Assignment -> Status Updates (In Progress, Completed) -> Cancellation or Rescheduling.
-   **Integrations**:
    -   Validates `customer_id`, `service_id`, and `staff_id` against their respective tables.
    -   Uses Server-Sent Events (SSE) to push real-time notifications to staff when they are assigned a new booking.
    -   Calculates totals based on `services` base prices and `service_addons`.

### 2. Companies (`features/company/companies/`)
Manages the tenants of the system.
-   **Operations**: Read, Update, Soft Delete.
-   **Access**: Only Super Admins and the company's own Admins can view or modify company settings.
-   **Data**: Stores global tenant settings like timezone, currency, and subscription tier.

### 3. Staff (`features/staff/`)
Manages the workforce for a company.
-   **Operations**: CRUD operations for employee profiles.
-   **Scheduling**: Staff can view their specifically assigned bookings. The system checks staff availability to prevent double-booking when rescheduling or assigning appointments.
-   **Access**: Staff members authenticate via JWT and are restricted to viewing data relevant to their assignments.

### 4. Customers (`features/customers/`)
Manages the client base.
-   **Operations**: CRUD operations for customer profiles.
-   **Booking History**: Customers are tied to their booking history for reference by company admins.

### 5. Admins (`features/admins/`)
Manages company-level administrators.
-   **Operations**: CRUD operations for admin users.
-   **Super Admin specific bypasses**: DAOs and services dynamically omit `company_id` filters when the request originates from a Super Admin, allowing global oversight.

### 6. Services (`features/services/`)
Manages the catalog of offerings.
-   **Structure**: A `Service` has a base price. It can also have associated `Addons` which increase the final price of a booking.

## Data Flow Example: Creating a Booking

1.  **Request**: Customer initiates a booking via the `/api/v1/bookings/create` endpoint.
2.  **Controller**: Validates payload via `Booking_Zod_Schema`.
3.  **Service**:
    -   Verifies the customer exists (via Customer DAO).
    -   Verifies the service exists and fetches pricing (via Service DAO).
    -   Checks requested addons and calculates final total.
    -   Automatically assigns staff if applicable (via Staff Availability Helper).
4.  **DAO**: Inserts the new booking record into the `bookings` table, and associated addons into `booking_addons` within a single PostgreSQL transaction.
5.  **Post-Creation**: If staff was assigned, SSE Manager emits a real-time event to the specific staff member's live connection.
6.  **Response**: Standardized success JSON returned to the client.
