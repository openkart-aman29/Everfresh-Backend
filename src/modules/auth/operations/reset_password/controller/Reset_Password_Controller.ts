import { Request, Response } from 'express';
import { z } from 'zod';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { resetPasswordZodSchema } from '@/modules/auth/operations/reset_password/zod_schema/Reset_Password_Zod_Schema';
import { resetPasswordService } from '@/modules/auth/operations/reset_password/service/Reset_Password_Service';

/**
 * ============================================================================
 * RESET PASSWORD CONTROLLER
 * ============================================================================
 * Purpose: Handle password reset with JWT token verification
 * 
 * Flow:
 * 1. Extract reset token and new password from request body
 * 2. Validate input using Zod schema (password strength, match confirmation)
 * 3. Pass validated data to service layer
 * 4. Service verifies JWT token, validates against DB hash, updates password
 * 5. Send confirmation email
 * 6. Return standardized response
 * 
 * Security Features:
 * ✅ JWT token verification (RS256 algorithm)
 * ✅ Token hash validation against database
 * ✅ Token expiry check (15 minutes)
 * ✅ Password strength validation
 * ✅ Password confirmation matching
 * ✅ Single-use tokens (revoked after successful reset)
 * ✅ Device/IP audit trail
 * ✅ User status validation (must be active)
 * 
 * Example Request Body:
 * {
 *   "resetToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "newPassword": "SecureP@ssw0rd123",
 *   "confirmPassword": "SecureP@ssw0rd123"
 * }
 * 
 * Example Success Response:
 * {
 *   "success": true,
 *   "message": "PASSWORD_RESET_SUCCESSFULLY",
 *   "status": 200,
 *   "code": "SUCCESS",
 *   "data": null,
 *   "errors": []
 * }
 * ============================================================================
 */

/**
 * Request body interface for reset password
 */
export interface ResetPasswordRequestInterface {
    resetToken: string;      // JWT token from email link
    newPassword: string;     // New password (min 8 chars, complexity required)
    confirmPassword: string; // Must match newPassword
}

/**
 * Reset Password Controller
 * Handles HTTP request/response for password reset completion
 */
export const resetPasswordController = async (
    req: Request,
    res: Response
): Promise<Response> => {
    try {
        authLogger.info('Starting reset password request @ resetPasswordController');

        /* ═══════════════════════════════════════════════════════════════════
           STEP 1: Extract request body
           
           ⚠️ SECURITY: Hide sensitive data in logs
           Never log plain passwords or tokens in production
           ═══════════════════════════════════════════════════════════════════ */
        
        const body = req.body;
        
        authLogger.info('Received reset password request @ resetPasswordController', {
            resetToken: body.resetToken ? '[TOKEN_PROVIDED]' : '[MISSING]',
            newPassword: body.newPassword ? '[PROVIDED]' : '[MISSING]',
            confirmPassword: body.confirmPassword ? '[PROVIDED]' : '[MISSING]'
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 2: Prepare request data
           ═══════════════════════════════════════════════════════════════════ */
        
        const requestBody: ResetPasswordRequestInterface = {
            resetToken: body.resetToken,
            newPassword: body.newPassword,
            confirmPassword: body.confirmPassword
        };

        /* ═══════════════════════════════════════════════════════════════════
           STEP 3: Validate request body using Zod schema
           
           Validation Rules:
           - resetToken: Required JWT string, non-empty
           - newPassword: Min 8 chars, must contain:
             * At least 1 uppercase letter
             * At least 1 lowercase letter
             * At least 1 number
             * At least 1 special character
           - confirmPassword: Must match newPassword
           ═══════════════════════════════════════════════════════════════════ */
        
        const parsedRequest = resetPasswordZodSchema.parse(requestBody);
        
        authLogger.info('Request validation successful @ resetPasswordController');

        /* ═══════════════════════════════════════════════════════════════════
           STEP 4: Extract device info and IP address for audit trail
           
           Security tracking:
           - Device info identifies the browser/device used
           - IP address helps detect suspicious activity
           - Both stored in audit logs
           ═══════════════════════════════════════════════════════════════════ */
        
        const deviceInfo = req.headers['user-agent'];
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() 
            || req.socket.remoteAddress 
            || 'unknown';

        authLogger.info('Request metadata extracted @ resetPasswordController', {
            deviceInfo: deviceInfo?.substring(0, 50) + '...',
            ipAddress
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 5: Call service layer for business logic
           
           Service responsibilities:
           1. Verify JWT token signature and expiry
           2. Extract user_id from token payload
           3. Fetch stored token hash from database
           4. Compare provided token with stored hash
           5. Validate token hasn't expired in database
           6. Hash new password using bcrypt
           7. Update password in database
           8. Revoke reset token (single-use enforcement)
           9. Send confirmation email
           ═══════════════════════════════════════════════════════════════════ */
        
        const serviceResponse: StandardResponseInterface<null> = 
            await resetPasswordService({
                resetToken: parsedRequest.resetToken,
                newPassword: parsedRequest.newPassword,
                confirmPassword: parsedRequest.confirmPassword,
                deviceInfo,
                ipAddress
            });

        authLogger.info('Service response received @ resetPasswordController', {
            success: serviceResponse.success,
            message: serviceResponse.message
        });

        /* ═══════════════════════════════════════════════════════════════════
           STEP 6: Prepare and send controller response
           ═══════════════════════════════════════════════════════════════════ */
        
        const controllerResponse: StandardResponseInterface<null> = {
            success: serviceResponse.success,
            message: serviceResponse.message,
            status: serviceResponse.status,
            code: serviceResponse.code,
            data: serviceResponse.data,
            errors: serviceResponse.errors
        };

        authLogger.info('Sending controller response @ resetPasswordController', {
            success: controllerResponse.success,
            status: controllerResponse.status,
            message: controllerResponse.message
        });

        return sendResponse(res, controllerResponse);

    } catch (error) {
        /* ═══════════════════════════════════════════════════════════════════
           ERROR HANDLING: Zod Validation Errors
           
           Common validation failures:
           - Token missing or empty
           - Password too weak
           - Passwords don't match
           - Invalid format
           ═══════════════════════════════════════════════════════════════════ */
        
        if (error instanceof z.ZodError) {
            const validationErrors = error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }));

            const status = 400;
            const validationResponse: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: validationErrors
            };

            authLogger.error('Validation error @ resetPasswordController', {
                errors: validationErrors
            });

            return sendResponse(res, validationResponse);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CATASTROPHIC ERROR HANDLING
           
           This should rarely happen if service layer handles errors properly
           Log full error details for debugging
           ═══════════════════════════════════════════════════════════════════ */
        
        authLogger.error('CRITICAL ERROR @ resetPasswordController', error);

        const status = 500;
        const errorResponse: StandardResponseInterface<null> = {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [
                {
                    field: 'server',
                    message: 'Failed to process password reset request due to internal error'
                }
            ]
        };

        return sendResponse(res, errorResponse);
    }
};

/**
 * ============================================================================
 * USAGE EXAMPLE
 * ============================================================================
 * 
 * // In your routes file:
 * import { resetPasswordController } from '@/modules/auth/operations/reset_password/controller/Reset_Password_Controller';
 * 
 * router.post(
 *     '/reset-password',
 *     resetPasswordController
 * );
 * 
 * ============================================================================
 * SECURITY BEST PRACTICES
 * ============================================================================
 * 
 * 1. ✅ JWT Token Verification:
 *    - Verify signature using RS256 algorithm
 *    - Check token expiry (15 minutes)
 *    - Extract user_id from payload
 * 
 * 2. ✅ Database Token Validation:
 *    - Compare JWT token hash with stored hash
 *    - Check database expiry timestamp
 *    - Ensure user is still active
 * 
 * 3. ✅ Password Security:
 *    - Minimum 8 characters
 *    - Complexity requirements enforced
 *    - Hashed using bcrypt before storage
 * 
 * 4. ✅ Single-Use Tokens:
 *    - Token revoked after successful reset
 *    - Prevents replay attacks
 *    - Cannot reuse same reset link
 * 
 * 5. ✅ Audit Trail:
 *    - Log all reset attempts
 *    - Track device info and IP address
 *    - Send confirmation email
 * 
 * 6. ✅ Error Messages:
 *    - Generic error for invalid/expired tokens
 *    - Prevents enumeration attacks
 *    - Specific errors only for validation
 * 
 * ============================================================================
 * ERROR SCENARIOS
 * ============================================================================
 * 
 * 1. Invalid Token:
 *    - JWT signature invalid
 *    - Token format incorrect
 *    - Token not found in database
 *    → Returns: INVALID_RESET_TOKEN (401)
 * 
 * 2. Expired Token:
 *    - JWT expired (> 15 minutes old)
 *    - Database expiry passed
 *    → Returns: RESET_TOKEN_EXPIRED (401)
 * 
 * 3. Validation Errors:
 *    - Password too weak
 *    - Passwords don't match
 *    - Missing required fields
 *    → Returns: VALIDATION_ERROR (400)
 * 
 * 4. User Not Found:
 *    - User deleted
 *    - User deactivated
 *    → Returns: USER_NOT_FOUND (404)
 * 
 * 5. Database Errors:
 *    - Connection failure
 *    - Update operation failed
 *    → Returns: INTERNAL_SERVER_ERROR (500)
 * 
 * ============================================================================
 */