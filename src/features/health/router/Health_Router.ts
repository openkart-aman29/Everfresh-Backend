import { Router } from 'express';
import {
    readHealthController,
} from '@/features/health/operations/read/controller/Read_Health_Controller';

const healthRouter = Router();

// // Health endpoints are intentionally public - probes and uptime monitors
// // cannot authenticate, and the payload exposes no tenant data.

// // GET /live - Liveness probe: process is running (no database access)
// healthRouter.get('/live', readLivenessController);

// // GET /ready - Readiness probe: returns 503 when the database is unreachable
// healthRouter.get('/ready', readReadinessController);

// GET / - Full health report: process vitals plus database probe
healthRouter.get('/', readHealthController);

export default healthRouter;
