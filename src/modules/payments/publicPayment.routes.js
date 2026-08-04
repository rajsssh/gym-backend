import { Router } from 'express';
import { submitPublicPayment } from './payment.controller.js';

const router = Router();

// PUBLIC PAYMENT (NO AUTH)
router.post('/submit', submitPublicPayment);

export default router;
