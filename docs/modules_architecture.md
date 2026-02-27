# Modules Architecture (`src/modules`)

The `src/modules` directory houses distinct functional components that operate cross-domain or are foundational to the application's infrastructure. In EverFresh, this is primarily dedicated to the complex **Auth** (Authentication & Authorization) system.

## The Auth Module (`src/modules/auth`)

The Auth module is the single source of truth for all identity, registration, session management, and access control across the entire platform (Super Admins, Admins, Staff, and Customers).

### Core Responsibilities

1. **Identity & Registration**
    *   **Sign-ups**: Handles distinct registration paths for:
        *   `Customer`: Direct registration. Requires personal information.
        *   `Staff`: Registration initiated by an Admin/Super Admin. Assigns a default password.
        *   `Admin`: Registration initiated by a Super Admin. Assigns administrative roles to a specific `company_id`.
    *   **Centralized User Table**: All identities (regardless of role) are stored in the core `users` table. They are then linked to their specific domain tables (`customers`, `staff`, `admins`) via the `user_id`.

2. **Session Management (JWT)**
    *   **Sign-in**: Validates credentials (using `Password_Manager`), generates a short-lived Access Token, and a long-lived Refresh Token.
    *   **Tokens**: Implements the `JWT_Manager` utilizing asymmetric key pairs (or robust symmetric signatures) to sign JSON Web Tokens.
    *   **Rotation**: The `Rotate_Access_Token_Controller` automatically issues new Access and Refresh tokens to mitigate hijacking risks when old tokens expire.
    *   **Sign-out**: Revokes refresh tokens in the database to securely end a session.

3. **Access Control (Authorization)**
    *   **`jwtVerificationMiddleware`**: Extracts the Authorization header (Bearer token) or HTTP-Only cookies, verifies the signature matching the payload, and attaches `req.user`.
    *   **`roleAuthorizationMiddleware`**: An interceptor that takes an array of acceptable roles (e.g., `['admin', 'super_admin']`) and blocks requests where `req.user.roles` does not intersect.

4. **Security & Utilities**
    *   **Password Resets**: The `ForgotPassword_Controller` and `Reset_Password_Controller` orchestrate secure token generation, email transmission, and cryptographic verifiable password updates.
    *   **Scheduler (`Token_Cleanup_Scheduler.ts`)**: A background recurring job that automatically prunes expired or revoked refresh tokens from the PostgreSQL database to maintain optimal performance.

## Architecture Pattern

Like the feature modules, the Auth module strictly adheres to the layered architecture, ensuring separation of concerns:

```
[Request]
   |
[Auth Router] -> Routes to specific endpoints (e.g., /api/v1/auth/signup/staff)
   |
[Controller]  -> Extracts payload -> Validates with Zod schemas -> Passes to Service
   |
[Service]     -> Orchestrates logic (Check if email exists -> hash password -> orchestrate DAOs)
   |
[DAOs]        -> Executes discrete SQL (e.g., Check_User_Exist_DAO, Insert_User_DAO)
   |
[Response]    -> Generates tokens/cookies and returns standardized success JSON
```

### Key Managers (`manager/`)
Instead of bloated services, specific cryptographic and token orchestration details are abstracted into standalone managers:
*   `JWT_Manager.ts`: Handles strictly token signing and verification mathematics.
*   `Password_Manager.ts`: Wraps `bcrypt` for hashing and comparing salted passwords.
*   `Token_Rotation_Manager.ts`: Handles the logic for validating old refresh tokens and issuing the new pair securely.

## Multi-Tenant Security Considerations

Because the Auth module serves a multi-tenant application, it handles critical security barriers:
-   **Role isolation**: `Staff` and `Admins` cannot register themselves; their accounts must be provisioned by a higher authority.
-   **Company bridging**: When a user logs in, the Auth service retrieves their `roles` and their associated `company_id`.
-   **Super Admin bridging**: The Auth service explicitly sets `company_id: null` and provides the `super_admin` role in the JWT payload for platform caretakers.

The output `req.user` object from the auth middleware provides the essential context (like `company_id`) that the independent Feature Modules (Bookings, Services) rely on to filter their SQL queries securely.
