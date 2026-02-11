import { Router } from 'express';
import { customerSignUpController } from '@/modules/auth/operations/signup/customer/controller/Customer_SignUp_Controller';
import { signInController } from '@/modules/auth/operations/signin/controller/SignIn_Controller';
import { signOutController } from '@/modules/auth/operations/signout/controller/SignOut_Controller';
import { refreshTokenController } from '@/modules/auth/operations/refresh_token/controller/Refresh_Token_Controller';
import { rateLimitMiddleware } from '@/utilities/middleware/Rate_Limit_Middleware';
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { roleAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';
import { staffSignUpController } from '@/modules/auth/operations/signup/staff/controller/Staff_SignUp_Controller'
import { rotateAccessTokenController } from '@/modules/auth/operations/rotate_access_token/controller/Rotate_Access_Token_Controller';
import { forgotPasswordController } from '@/modules/auth/operations/forgot_password/controller/Forgot_Password_Controller';
import { resetPasswordController } from '@/modules/auth/operations/reset_password/controller/Reset_Password_Controller';


const authRouter = Router();

// Apply rate limiting to all auth routes
authRouter.use(rateLimitMiddleware);

// Public routes (no auth required)
authRouter.post('/signup/customer', customerSignUpController);
authRouter.post('/signin', signInController);

// Protected routes (auth required)
authRouter.post('/signout', jwtVerificationMiddleware, signOutController);
authRouter.post('/refresh-token', jwtVerificationMiddleware, refreshTokenController);
authRouter.post("/rotate-token", rotateAccessTokenController);

// TODO: Add more routes
authRouter.post('/signup/staff', jwtVerificationMiddleware, roleAuthorizationMiddleware(['admin', 'superadmin']), staffSignUpController);
// authRouter.post('/signup/admin', adminSignUpController);
authRouter.post('/forgot-password', forgotPasswordController);
authRouter.post('/reset-password', resetPasswordController);
// authRouter.post('/change-password', changePasswordController);

export default authRouter;