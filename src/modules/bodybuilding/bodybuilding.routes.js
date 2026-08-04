import express from 'express';
import { createLog, getLogs } from './bodybuilding.controller.js';
import { verifyToken } from '../../middlewares/auth.js';

const router = express.Router();

router.post('/:memberId', verifyToken(), createLog);
router.get('/:memberId', verifyToken(), getLogs);

export default router;
