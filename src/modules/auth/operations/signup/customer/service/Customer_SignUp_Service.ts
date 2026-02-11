import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { passwordManager } from '@/modules/auth/manager/Password_Manager';
import { checkUserExistByEmail, checkUserExistByPhone } from '@/modules/auth/database/dao/Check_User_Exist_DAO';
import { createCustomerWithProfile } from '@/modules/auth/operations/signup/customer/dao/Customer_SignUp_DAO';
import { CustomerSignUpInput } from '@/modules/auth/operations/signup/customer/zod_schema/Customer_SignUp_Zod_Schema';
import { UserResponseInterface } from '@/modules/auth/interface/Auth_Interface';
import EmailBrevoService from "@/utilities/email/services/Email_Brevo_Service"

export const customerSignUpService = async (
    input: CustomerSignUpInput
): Promise<StandardResponseInterface<UserResponseInterface | null>> => {
    try {
        authLogger.info('Customer signup - service', { email: input.email });

        // 1. Check if email already exists
        const emailExists = await checkUserExistByEmail(input.email);
        if (emailExists.exists) {
            const status = 409;
            return {
                success: false,
                message: 'EMAIL_ALREADY_EXISTS',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'email', message: 'Email is already registered' }]
            };
        }

        /* 1️⃣ Phone uniqueness */
        const phoneExists = await checkUserExistByPhone(input.phone);
        if (phoneExists.exists) {
            const status = 409;
            return {
                success: false,
                message: 'PHONE_ALREADY_EXISTS',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'phone', message: 'Phone already registered' }]
            };
        }

        // // 2. Validate password strength
        // const passwordValidation = passwordManager.validatePasswordStrength(input.password);
        // if (!passwordValidation.isValid) {
        //     const status = 400;
        //     return {
        //         success: false,
        //         message: 'WEAK_PASSWORD',
        //         status,
        //         code: getErrorStatus(status),
        //         data: null,
        //         errors: passwordValidation.errors.map(err => ({
        //             field: 'password',
        //             message: err
        //         }))
        //     };
        // }

        // 3. Hash password
        const passwordHash = await passwordManager.hashPassword(input.password);

        // 4. Generate IDs
        const userId = generateULID();
        const customerId = generateULID();
        // const customerCode = `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // 5. Prepare user data
        const userData = {
            user_id: userId,
            company_id: input.company_id,
            email: input.email.toLowerCase(),
            password_hash: passwordHash,
            first_name: input.first_name,
            last_name: input.last_name,
            phone: input.phone,
            is_active: true,
            email_verified: false,
            phone_verified: false
        };

        // 6. Prepare customer data
        const customerData = {
            customer_id: customerId,
            company_id: input.company_id,
            user_id: userId,
        };

        // 7. Create user and customer profile
        const result = await createCustomerWithProfile(userData, customerData);

        if (!result.success) {
            const status = 500;
            return {
                success: false,
                message: 'REGISTRATION_FAILED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'database', message: 'Failed to create customer account' }]
            };
        }

        // 8. Prepare response (exclude sensitive data)
        const userResponse: UserResponseInterface = {
            user_id: result.user.user_id,
            company_id: result.user.company_id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            phone: result.user.phone,
            is_active: result.user.is_active,
            email_verified: result.user.email_verified,
            roles: ['customer'],
            created_at: result.user.created_at
        };
        // Send sign-in success email notification
        if (userResponse.email) {
            try {
                const currentDate = new Date();
                const signInDate = currentDate.toLocaleDateString();
                const signInTime = currentDate.toLocaleTimeString();

                await EmailBrevoService.sendTemplateEmail(
                    'sign-up-success',
                    {
                        firstName: userResponse.first_name,
                        userEmail: userResponse.email,
                        signInDate: signInDate,
                        signInTime: signInTime,
                        ipAddress: 'Not available', // Could be passed from request if needed
                    },
                    {
                        to: userResponse.email,
                        subject: 'Sign Up Successful - Everfresh',
                    }
                );

                authLogger.info("Sign-Up success email sent successfully - signUpService", {
                    userEmail: userResponse.email,
                    userName: userResponse.first_name
                });

            } catch (emailError) {
                authLogger.error("Failed to send sign-Up success email - signUpService", emailError);
                // Don't fail the entire operation if email fails
            }
        }
        // Send sign-up success email notification
        // if (userResponse.email) {
        //     try {
        //         const currentDate = new Date();
        //         const signInDate = currentDate.toLocaleDateString('en-US', { 
        //             year: 'numeric', 
        //             month: 'long', 
        //             day: 'numeric' 
        //         });
        //         const signInTime = currentDate.toLocaleTimeString('en-US', { 
        //             hour: '2-digit', 
        //             minute: '2-digit',
        //             timeZoneName: 'short'
        //         });

        //         await EmailBrevoService.sendTemplateEmail(
        //             'sign-in-success',
        //             {
        //                 firstName: userResponse.first_name, // ✅ FIX: Use firstName instead of userName
        //                 userEmail: userResponse.email,
        //                 signInDate: signInDate,
        //                 signInTime: signInTime,
        //                 ipAddress: 'Not available',
        //             },
        //             {
        //                 to: userResponse.email,
        //                 subject: 'Welcome to Field360 - Sign Up Successful',
        //             }
        //         );

        //         authLogger.info("Sign-up success email sent successfully", {
        //             userEmail: userResponse.email,
        //             userName: userResponse.first_name
        //         });

        //     } catch (emailError: any) {
        //         // ✅ FIX: Log only safe error properties
        //         authLogger.error("Failed to send sign-up success email", {
        //             error: emailError?.message || 'Unknown error',
        //             userEmail: userResponse.email
        //         });
        //         // Don't fail the entire operation if email fails
        //     }
        // }
        const status = 201;
        return {
            success: true,
            message: 'CUSTOMER_REGISTERED_SUCCESSFULLY',
            status,
            code: "SUCCESS",
            data: userResponse,
            errors: []
        };

    } catch (error) {
        authLogger.error('Error in customer signup service', error);
        const status = 500;
        return {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }]
        };
    }
};