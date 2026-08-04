import express from "express";
import {
  housekeepingCheckIn,
  housekeepingCheckOut,
  housekeepingHistory
} from "./housekeepingattendance.controller.js";

const router = express.Router();

router.post("/checkin", housekeepingCheckIn);
router.put("/checkout/:id", housekeepingCheckOut);
router.get("/history/:staffId", housekeepingHistory);

export default router;
