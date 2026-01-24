// src/features/customers/routes/Customer_Router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '@/database/Database_Connection_Manager';

// Controllers
import { readCustomerController } from '@/features/customers/operations/read/controller/Read_Customer_Controller';
import { readAllCustomersController } from '@/features/customers/operations/read_all/controller/Read_All_Customers_Controller';
import { updateCustomerController } from '@/features/customers/operations/update/controller/Update_Customer_Controller';
import { deleteCustomerController } from '@/features/customers/operations/delete/controller/Delete_Customer_Controller';


// Middleware
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { permissionAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';
import { rateLimitMiddleware } from '@/utilities/middleware/Rate_Limit_Middleware';

const customerRouter = Router();

// Apply rate limiting to all routes
customerRouter.use(rateLimitMiddleware);

// Instantiate controllers that are class-based (pass pool) - none for now
const pool = getDatabase();

// Customer routes - all require authentication
customerRouter.get('/read/:customerId', jwtVerificationMiddleware, readCustomerController);

// Placeholder routes for future operations
customerRouter.get('/read-all',jwtVerificationMiddleware, readAllCustomersController);
customerRouter.patch('/update/:customerId', jwtVerificationMiddleware, updateCustomerController);
customerRouter.delete('/delete/:customerId', jwtVerificationMiddleware, deleteCustomerController);

export default customerRouter;