import { Router } from 'express';
import { readAllServicesController } from '@/features/services/operations/read_all/controller/Read_All_Services_Controller';
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { roleAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';

const serviceRouter = Router();

// GET /read-all - Active service catalogue for the caller's company
serviceRouter.get(
    '/read-all',
    jwtVerificationMiddleware,
    roleAuthorizationMiddleware(['staff', 'admin', 'super_admin']),
    readAllServicesController
);

export default serviceRouter;
