import { Router, Request, Response } from 'express';
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { roleAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';
import { sseManager } from '@/utilities/sse/SSE_Manager';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';

const sseRouter = Router();

// Endpoint to establish SSE connection
// Only authenticated staff/admin can connect
sseRouter.get('/events',
    jwtVerificationMiddleware,
    roleAuthorizationMiddleware(['staff', 'admin', 'superadmin']),
    (req: Request, res: Response) => {
        const user = req.user;

        if (!user) {
            authLogger.error('SSE Connection Attempt without User', { headers: req.headers });
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        sseManager.addClient(req, res, user.user_id, user.company_id);
    }
);

export default sseRouter;
