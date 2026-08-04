import express from "express";
import {
  getAttendanceByAdminId,
  memberCheckIn,
  memberCheckOut,
  getDailyAttendance,
  attendanceDetail,
  getTodaySummary,
  getAttendanceByMemberId,
  deleteAttendance
} from "./memberattendence.controller.js";

const router = express.Router();

/**
 * Attendance Routes
 */

// ✅ Member Check-in (QR + Manual)
router.get("/admin", getAttendanceByAdminId);
router.post("/checkin", memberCheckIn);

// ✅ Member Check-out
router.put("/checkout/:id", memberCheckOut);

// ✅ Daily Attendance Report (with search, filter)
router.get("/daily", getDailyAttendance);


router.get("/:memberId", getAttendanceByMemberId);
// ✅ Attendance by Admin



// ✅ View Single Attendance Detail (for action button)
router.get("/:id", attendanceDetail);

// ✅ Dashboard Summary (Present, Active, Completed)
router.get("/summary/today", getTodaySummary);

router.delete("/delete/:id", deleteAttendance);

export default router;