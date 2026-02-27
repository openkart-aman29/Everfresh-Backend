# Overall Architecture

This document provides a high-level overview of the EverFresh Backend architecture, excluding the feature-specific and module-specific details (which are covered in their respective documentation files).

## Tech Stack Overview

*   **Runtime:** Node.js
*   **Web Framework:** Express.js
*   **Database:** PostgreSQL (using `pg` driver)
*   **Language:** TypeScript
*   **Validation:** Zod
*   **Authentication:** JWT (JSON Web Tokens)
*   **Logging:** Winston (via custom logger manager)
*   **Real-time events:** Server-Sent Events (SSE)

## Directory Structure (Top Level)

The main `src` directory is organized as follows:

```
src/
├── App.ts                  // Express application setup (middleware, error handling)
├── Server.ts               // Entry point, database connection, server listener
├── configurations/         // Environment variables and global configurations
├── database/               // Global database connection manager
├── features/               // Domain-specific business logic (e.g., bookings, staff) -> See features_architecture.md
├── modules/                // Cross-domain utilities and authentication -> See modules_architecture.md
├── router/                 // Main API router combining all feature routers
└── utilities/              // Shared helper functions, middlewares, and services
```

## Core Components

### 1. Application Entry (`Server.ts` & `App.ts`)
*   `App.ts` configures the Express application, injecting global middlewares such as:
    *   **Security:** `helmet`, `cors`
    *   **Parsing:** `express.json`, `cookie-parser`
    *   **Logging:** `morgan` and custom Winston loggers
    *   **Rate Limiting:** `express-rate-limit`
*   `Server.ts` is the literal entry point. It initializes the database connection via `Database_Connection_Manager.ts`, starts background tasks (like token cleanup), and starts listening on the configured HTTP port. It also registers graceful shutdown handlers (`SIGINT`, `SIGTERM`).

### 2. Configuration (`configurations/`)
*   The `ENV_Configuration.ts` centralizes environment variable parsing and validation (often using Zod). This ensures the application crashes early if necessary configurations (like DB credentials or secrets) are missing.

### 3. Database Management (`database/`)
*   `Database_Connection_Manager.ts` manages the PostgreSQL `Pool`. It provides `connectDatabase()` for initial setup and `getDatabase()`/`getPool()` for retrieving the active connection pool anywhere in the application.

### 4. Global Routing (`router/`)
*   `Main_Router.ts` serves as the central hub for the API. It mounts the routers from both `src/features` and `src/modules` onto the `/api/v1` prefix.

### 5. Shared Utilities (`utilities/`)
This directory contains code reused across multiple features and modules:
*   **`email/`**: Services for sending transactional emails (e.g., using Brevo).
*   **`http/`**: Standardized HTTP responses (`Standard_Response`), status codes, and error formatting.
*   **`logger/`**: The `Logger_Manager` that provides a standardized Winston logger instance for different file types.
*   **`middleware/`**: Global middlewares like `Rate_Limit_Middleware`.
*   **`sse/`**: The `SSEManager` class handles Server-Sent Events for real-time push notifications to clients.
*   **`id_generator/`**, **`global_schemas/`**, **`global_interfaces/`**: Shared TS types, Zod schemas, and ID generation logic (ULID).

## Architecture Pattern & Detailed Request Flow

The project strictly follows a layered architecture pattern:

```text
Controller Layer (HTTP Request/Response + Validation)
    ↓
Service Layer (Business Logic + Orchestration)
    ↓
DAO Layer (Data Access Operations)
    ↓
PostgreSQL Database (pg.Pool)
```

### Detailed Request Lifecycle
1. **Incoming Request:** Arrives at the feature router (e.g., `Booking_Router.ts`).
2. **Controller:** 
   - Receives the request.
   - Validates the payload using **Zod** schemas. If validation fails, returns a 400 Bad Request immediately.
   - Extracts multi-tenant context (`company_id`) and user information from the `req.user` object (populated by Auth middleware).
   - Delegates to the appropriate Service method.
3. **Service (Business Logic):**
   - Orchestrates the core business rules.
   - Calls Helper functions for complex validations or calculations (e.g., checking staff availability, calculating order totals).
   - Ensures data integrity and enforces constraints before interacting with the database.
   - Calls the necessary Data Access Objects (DAOs).
4. **DAO (Data Access Object):**
   - Encapsulates raw SQL queries.
   - Reuses the global `pg.Pool` connection from the `Database_Connection_Manager`.
   - Performs parameterized `SELECT`, `INSERT`, `UPDATE`, or `DELETE` queries.
   - Contains NO business logic; it strictly executes DB commands and returns typed row objects.
5. **Response:** Flows backward. The Service returns structured data or throws domain errors. The Controller captures this, logs the outcome using Winston (`info`, `warn`, `error`), and formats a standardized HTTP response.

### Core Architecture Principles

*   **Database Interface and DAOs:** DAOs are narrowly focused. For instance, a DAO might `findById(id, company_id)` ensuring tenant isolation, or `softDelete()`. They handle SQL constraints but never check business states (like staff availability).
*   **Validation (Zod):** Validation is pushed to the very edge of the application (Controllers). Shared validators (like ULID formats) are centralized.
*   **Logging (Winston):** Centralized logger configuration with per-feature loggers writing to `logs/{DATE}/FeatureName/`. 
    *   `info`: Successful operations or significant state changes.
    *   `warn`: Recoverable edge cases (e.g., no staff available).
    *   `error`: Database or runtime errors.
*   **Transactions:** Multi-step DB operations within Services must utilize SQL transactions (via DAO) to prevent partial failures.
*   **Soft Deletion:** Most underlying entities (like Bookings, Companies) are soft-deleted by setting a `deleted_at` timestamp to maintain historical audit trails.
*   **Error Handling:** All endpoints return standardized JSON errors: `{ "status": "error", "code": HTTP_STATUS, "message": "..." }`.

## File Naming and Folder Structure Convention

Within each feature (e.g., `src/features/company/bookings/`), files are organized by specific operations to keep concerns separated and maintain a predictable structure:

```text
feature_name/
├── interface/             // TypeScript types and DTO interfaces
├── logger/                // Feature-specific Winston logger initialization
├── router/                // Express router for the feature
├── zod_schema/            // Zod validation schemas
└── operations/
    ├── create/
    │   ├── controller/    // e.g., Create_Booking_Controller.ts
    │   ├── service/       // e.g., Create_Booking_Service.ts
    │   └── dao/           // e.g., Create_Booking_DAO.ts
    ├── read/
    ├── update/
    └── helpers/           // Shared utility functions specific to the feature
```
