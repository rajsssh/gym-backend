import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";

import {
  memberCheckIn,
  memberCheckOut,
  memberAttendanceList,
  staffCheckIn,
  staffCheckOut,
  staffAttendanceList,
  publicMemberCheckIn,
  publicMemberCheckOut,
  publicStaffCheckIn,
  publicStaffCheckOut
} from "./memberAttendance.controller.js   ";

const router = Router();

// PUBLIC ATTENDANCE (VIA QR URL)
router.post("/public/member/checkin", publicMemberCheckIn);
router.post("/public/member/checkout", publicMemberCheckOut);
router.post("/public/staff/checkin", publicStaffCheckIn);
router.post("/public/staff/checkout", publicStaffCheckOut);

// MEMBER ATTENDANCE
router.post(
  "/member/checkin",
  verifyToken(["Admin", "Staff", "Member", "Superadmin"]),
  memberCheckIn
);

router.post(
  "/member/checkout",
  verifyToken(["Admin", "Staff", "Member", "Superadmin"]),
  memberCheckOut
);

router.get(
  "/member/history/:memberId",
  verifyToken(["Admin", "Staff", "Member", "Superadmin"]),
  memberAttendanceList
);

// STAFF ATTENDANCE
router.post(
  "/staff/checkin",
  verifyToken(["Admin", "Staff", "Superadmin"]),
  staffCheckIn
);

router.post(
  "/staff/checkout",
  verifyToken(["Admin", "Staff", "Superadmin"]),
  staffCheckOut
);

router.get(
  "/staff/history/:staffId",
  verifyToken(["Admin", "Staff", "Superadmin"]),
  staffAttendanceList
);

export default router;
