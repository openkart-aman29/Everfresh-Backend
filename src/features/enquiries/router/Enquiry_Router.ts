import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createEnquiryController } from '@/features/enquiries/operations/create/controller/Create_Enquiry_Controller';
import { readAllEnquiriesController } from '@/features/enquiries/operations/read_all/controller/Read_All_Enquiries_Controller';
import { updateEnquiryStatusController } from '@/features/enquiries/operations/update_status/controller/Update_Enquiry_Status_Controller';
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { roleAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';

const enquiryRouter = Router();

/**
 * The submit endpoint is unauthenticated, so it gets a far tighter limit than
 * the global one: a genuine visitor submits once, a spam bot does not.
 */
const submitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
        success: false,
        status: 429,
        message: 'TOO_MANY_ENQUIRIES',
        code: 'TOO_MANY_REQUESTS',
        data: null,
        errors: [{ field: 'rate_limit', message: 'Too many requests. Please try again later.' }],
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /create - PUBLIC. Raise a service request from the website, no account needed.
enquiryRouter.post('/create', submitLimiter, createEnquiryController);

// GET /read-all - Admin inbox (super admins see every tenant)
enquiryRouter.get(
    '/read-all',
    jwtVerificationMiddleware,
    roleAuthorizationMiddleware(['admin', 'super_admin']),
    readAllEnquiriesController
);

// PATCH /update-status/:enquiryId - Triage an enquiry
enquiryRouter.patch(
    '/update-status/:enquiryId',
    jwtVerificationMiddleware,
    roleAuthorizationMiddleware(['admin', 'super_admin']),
    updateEnquiryStatusController
);

export default enquiryRouter;
