import { Router } from 'express';
import { Pool } from 'pg';
import bookingRouter from '@/features/company/bookings/router/Booking_Router';
import { getDatabase } from '@/database/Database_Connection_Manager';
import authRouter from '@/modules/auth/router/Auth_Router';
import customerRouter from '@/features/customers/router/Customer_Router';
import staffRouter from '@/features/staff/router/Staff_Router';
// import companyRouter from '@/features/companies/router/Company_Router';
// import serviceRouter from '@/features/services/router/Service_Router';
// import paymentRouter from '@/features/payments/router/Payment_Router';

import sseRouter from '@/features/company/bookings/router/SSE_Router';

export const createMainRouter = (pool?: Pool) => {
  const mainRouter = Router();
  // If a pool is provided, it may be used by feature modules.
  // Most routers obtain the pool via `getDatabase()` internally.

  // Feature routes (bookingRouter is a Router instance)
  mainRouter.use('/bookings', bookingRouter);
  mainRouter.use('/sse', sseRouter);
  mainRouter.use('/auth', authRouter);
  mainRouter.use('/customers', customerRouter);
  mainRouter.use('/staff', staffRouter);
  // mainRouter.use('/companies', companyRouter);
  // mainRouter.use('/services', serviceRouter);
  // mainRouter.use('/payments', paymentRouter);

  return mainRouter;
};

// Export default for backward compatibility
const defaultRouter = Router();
export default defaultRouter;