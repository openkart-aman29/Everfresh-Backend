
import { Router } from 'express';

// Controllers
import { readAdminController } from '@/features/admins/operations/read/controller/Read_Admin_Controller';
import { readAllAdminsController } from '@/features/admins/operations/read_all/controller/Read_All_Admin_Controller';
import { updateAdminController } from '@/features/admins/operations/update/controller/Update_Admin_Controller';
import { deleteAdminController } from '@/features/admins/operations/delete/controller/Delete_Admin_Controller';

// Middleware
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { rateLimitMiddleware } from '@/utilities/middleware/Rate_Limit_Middleware';
import { roleAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';

const adminRouter = Router();

// Apply rate limiting to all routes
adminRouter.use(rateLimitMiddleware);

// Admin routes - all require authentication
// Note: permissionAuthorizationMiddleware can be added here if specific permissions are needed for reading admin details
// GET /read-all - Get all admins with pagination and filters
adminRouter.get('/read-all', jwtVerificationMiddleware, roleAuthorizationMiddleware(['super_admin']), readAllAdminsController);

// GET /read/:adminId - Get admin by ID
adminRouter.get('/read/:adminId', jwtVerificationMiddleware, roleAuthorizationMiddleware(['admin', 'super_admin']), readAdminController);

// PUT /update/:adminId - Update admin details
adminRouter.put('/update/:admin_id', jwtVerificationMiddleware, roleAuthorizationMiddleware(['admin', 'super_admin']), updateAdminController);

// DELETE /delete/:admin_id - Delete admin
adminRouter.delete('/delete/:admin_id', jwtVerificationMiddleware, roleAuthorizationMiddleware(['super_admin']), deleteAdminController);

export default adminRouter;
