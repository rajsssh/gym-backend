import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import {
  createWorkoutPlan,
  assignWorkoutPlan,
  getMemberWorkoutPlan,
} from "./workout.controller.js";

const router = Router();

/**
 * Create workout plan
 * Allowed: Trainer (Staff), Admin, Superadmin
 */
router.post(
  "/create",
  verifyToken(["Staff", "Admin", "Superadmin"]),
  createWorkoutPlan
);

/**
 * Assign workout plan to member
 */
router.post(
  "/assign",
  verifyToken(["Staff", "Admin", "Superadmin"]),
  assignWorkoutPlan
);

/**
 * Get workout plan history for a member
 */
router.get(
  "/member/:memberId",
  verifyToken(),
  getMemberWorkoutPlan
);

export default router;
