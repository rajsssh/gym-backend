import express from "express";
import {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift,
  updateShiftStatus,
  getShiftByShiftId,
  getShiftByStaffId
} from "./shift.controller.js";

const router = express.Router();

router.post("/create", createShift);
router.get("/all/:adminId", getAllShifts);
router.get("/:id", getShiftById);
router.get("/byshiftId/:shiftId", getShiftByShiftId);
router.get("/bystaff/:staffId", getShiftByStaffId);

router.put("/:id", updateShift);
router.put("/status/:id", updateShiftStatus);
router.delete("/:id", deleteShift);

export default router;