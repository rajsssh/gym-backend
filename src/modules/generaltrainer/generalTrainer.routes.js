import { Router } from "express";
import {
  checkInMember,
  checkOutMember,
  deleteAttendanceRecord,
  getAllGroupTrainingPlans,
  getAttendanceById,
  getClassPerformanceReport,
  getMemberBookings,
  getPlanMembers,
  getDashboardData,
  getAllMembersByBranch,
} from "./generalTrainer.controller.js";

const router = Router();

router.get("/dashboard", getDashboardData);
// Get all group training plans with members for a specific branch
// Route: GET /api/branch/:branchId/group-plans
router.get("/:adminId/group-plans", getAllGroupTrainingPlans);

// Get members for a specific plan
// Route: GET /api/branch/:branchId/group-plans/:planId/members
router.get("/:branchId/group-plans/:planId/members", getPlanMembers);

// Get detailed booking information for a specific member
// Route: GET /api/branch/:branchId/members/:memberId/bookings
router.get("/:branchId/members/:memberId/bookings", getMemberBookings);

router.get("/:adminId/class-performance", getClassPerformanceReport);

router.get("/:id", getAttendanceById);
router.get("/branch/:branchId/members", getAllMembersByBranch);

// POST /api/attendance/checkin - Check in a member
router.post("/checkin", checkInMember);

// PUT /api/attendance/:id/checkout - Check out a member
router.put("/:id/checkout", checkOutMember);

// DELETE /api/attendance/:id - Delete an attendance record
router.delete("/:id", deleteAttendanceRecord);

export default router;
