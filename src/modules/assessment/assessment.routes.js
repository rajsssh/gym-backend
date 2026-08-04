import { Router } from 'express';
import * as assessmentController from './assessment.controller.js';
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

// POST /api/v1/assessments
router.post(
  '/', 
  verifyToken(["Superadmin", "Admin", "generaltrainer", "personaltrainer"]), 
  assessmentController.createAssessment
);

// GET /api/v1/assessments/member/:id/latest
router.get(
  '/member/:id/latest', 
  verifyToken(["Superadmin", "Admin", "generaltrainer", "personaltrainer", "member"]), 
  assessmentController.getLatestAssessment
);

// GET /api/v1/assessments/member/:id/history
router.get(
  '/member/:id/history', 
  verifyToken(["Superadmin", "Admin", "generaltrainer", "personaltrainer", "member"]), 
  assessmentController.getAssessmentHistory
);

export default router;
