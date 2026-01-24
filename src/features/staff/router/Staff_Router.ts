// src/features/staff/router/Staff_Router.ts
import { Router } from 'express';
import { getDatabase } from '@/database/Database_Connection_Manager';

// Controllers
import { readStaffController } from '@/features/staff/operations/read/controller/Read_Staff_Controller';
import { readAllStaffController } from '@/features/staff/operations/read_all/controller/Read_All_Staff_Controller';
import { updateStaffController } from '@/features/staff/operations/update/controller/Update_Staff_Controller';
import { deleteStaffController } from '@/features/staff/operations/delete/controller/Delete_Staff_Controller';
import { readAssignedBookingsController } from '@/features/staff/operations/read_assigned_bookings/controller/Read_Assigned_Bookings_Controller';
// Middleware
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { permissionAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';
import { rateLimitMiddleware } from '@/utilities/middleware/Rate_Limit_Middleware';

const staffRouter = Router();

// Apply rate limiting to all routes
staffRouter.use(rateLimitMiddleware);

// Instantiate controllers that are class-based (pass pool) - none for now
const pool = getDatabase();

// Staff routes - all require authentication
staffRouter.get('/read/:staffId',jwtVerificationMiddleware, readStaffController);
staffRouter.get('/read-all', jwtVerificationMiddleware, readAllStaffController);
staffRouter.patch('/update/:staffId', jwtVerificationMiddleware, updateStaffController);
staffRouter.delete('/delete/:staffId', jwtVerificationMiddleware, deleteStaffController);
staffRouter.get('/read-assigned-bookings/:staffId', jwtVerificationMiddleware,readAssignedBookingsController);


export default staffRouter;