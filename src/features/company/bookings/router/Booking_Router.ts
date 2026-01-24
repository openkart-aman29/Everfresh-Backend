// src/features/bookings/router/Booking_Router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '@/database/Database_Connection_Manager';

// Controllers (functions and classes mixed)
import { createBookingController } from '@/features/company/bookings/operations/create/controller/Create_Booking_Controller';
import { readBookingController } from '@/features/company/bookings/operations/read/controller/Read_Booking_Controller';
import { readAllBookingsController } from '@/features/company/bookings/operations/read_all/controller/Read_All_Bookings_Controller';
import { updateBookingController } from '@/features/company/bookings/operations/update/controller/Update_Booking_Controller';
import { cancelBookingController } from '@/features/company/bookings/operations/cancel/controller/Cancel_Booking_Controller';
import { rescheduleBookingController } from '@/features/company/bookings/operations/reschedule/controller/Reschedule_Booking_Controller';
import { assignStaffController } from '@/features/company/bookings/operations/assign_staff/controller/Assign_Staff_Controller';
import { updateStatusController } from '@/features/company/bookings/operations/update_status/controller/Update_Status_Controller';
import { DeleteBookingController } from '@/features/company/bookings/operations/delete/controller/Delete_Booking_Controller';
import { AddAddonController } from '@/features/company/bookings/operations/add_addon/controller/Add_Addon_Controller';

// Middleware
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { roleAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';
import { rateLimitMiddleware } from '@/utilities/middleware/Rate_Limit_Middleware';

const bookingRouter = Router();

// Apply rate limiting to all routes
bookingRouter.use(rateLimitMiddleware);

// Instantiate controllers that are class-based (pass pool)
const pool = getDatabase();
const deleteBookingController = new DeleteBookingController(pool!);
const addAddonController = new AddAddonController(pool!);

// Public routes
bookingRouter.post('/create', jwtVerificationMiddleware, createBookingController);
bookingRouter.get('/read/:booking_id', jwtVerificationMiddleware, readBookingController);
bookingRouter.post('/cancel/:booking_id', jwtVerificationMiddleware, cancelBookingController);

// Staff/Admin routes
bookingRouter.post('/reschedule/:booking_id', jwtVerificationMiddleware, roleAuthorizationMiddleware(['admin', 'superadmin']), rescheduleBookingController);
bookingRouter.get('/read-all', jwtVerificationMiddleware,roleAuthorizationMiddleware(['staff', 'admin', 'superadmin']),readAllBookingsController);
// bookingRouter.patch('/update/:booking_id', jwtVerificationMiddleware, roleAuthorizationMiddleware(['staff', 'admin', 'superadmin']), updateBookingController);
bookingRouter.patch('/assign-staff/:booking_id', jwtVerificationMiddleware, roleAuthorizationMiddleware(['admin', 'superadmin']), assignStaffController);
// bookingRouter.patch('/update-status/:booking_id', jwtVerificationMiddleware, roleAuthorizationMiddleware(['staff', 'admin', 'superadmin']), updateStatusController);

// // Admin only
// bookingRouter.delete('/delete/:booking_id', jwtVerificationMiddleware, roleAuthorizationMiddleware(['admin', 'superadmin']), (req: Request, res: Response, next: NextFunction) => deleteBookingController.deleteBooking(req, res).catch(next));

// // Addon route (example)
// bookingRouter.post('/add-addon/:booking_id', jwtVerificationMiddleware, roleAuthorizationMiddleware(['staff', 'admin', 'superadmin']), (req: Request, res: Response, next: NextFunction) => addAddonController.addAddon(req, res).catch(next));

export default bookingRouter;
