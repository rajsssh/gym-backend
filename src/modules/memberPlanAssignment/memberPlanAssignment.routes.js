import { Router } from "express";
import {
  assignPlans,
  getMemberAssignments,
  getActivePlans,
  updateAssignment,
  removeAssignment,
  deleteAssignmentPermanently,
  getPlanMembers,
  renewAssignment,
} from "./memberPlanAssignment.controller.js";

const router = Router();

// Assign multiple plans to a member
router.post("/assign", assignPlans);

// Get all plan assignments for a member
router.get("/member/:memberId", getMemberAssignments);

// Get active plan assignments for a member
router.get("/member/:memberId/active", getActivePlans);

// Update a plan assignment
router.put("/:id", updateAssignment);

// Remove (soft delete) a plan assignment
router.delete("/:id", removeAssignment);

// Permanently delete a plan assignment
router.delete("/:id/permanent", deleteAssignmentPermanently);

// Get all members with a specific plan
router.get("/plan/:planId/members", getPlanMembers);

// Renew a plan assignment
router.post("/:id/renew", renewAssignment);

export default router;

