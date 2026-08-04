import { Router } from "express";
import {
  publicMemberCheckIn,
  publicMemberCheckOut,
  publicStaffCheckIn,
  publicStaffCheckOut
} from "./publicAttendance.controller.js";

const router = Router();

// PUBLIC ATTENDANCE (VIA QR URL)
router.post("/member/checkin", publicMemberCheckIn);
router.post("/member/checkout", publicMemberCheckOut);
router.post("/staff/checkin", publicStaffCheckIn);
router.post("/staff/checkout", publicStaffCheckOut);

export default router;
