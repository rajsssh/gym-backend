import { Router } from "express";
import {
  addHealthLog,
  getMemberHealthLogs,
  getAllHealthLogs,
  getHealthLogsByTrainer,
  updateHealthLog,
  deleteHealthLog,
} from "./health.controller.js";

const router = Router();

// Add a new health log
router.post("/", addHealthLog);

// Get health logs for a specific member
router.get("/member/:memberId", getMemberHealthLogs);

// Get all health logs for an admin
router.get("/all/:adminId", getAllHealthLogs);

// Get health logs for all members assigned to a trainer
router.get("/trainer/:trainerId", getHealthLogsByTrainer);

// Fallback GET by memberId
router.get("/:memberId", getMemberHealthLogs);

// Update a health log
router.put("/:id", updateHealthLog);

// Delete a health log
router.delete("/:id", deleteHealthLog);

export default router;
