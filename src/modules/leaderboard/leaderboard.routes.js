import express from 'express';
import { getLeaderboard } from './leaderboard.controller.js';
import { verifyToken } from '../../middlewares/auth.js';

const router = express.Router();

router.get('/', verifyToken(), getLeaderboard);

export default router;
