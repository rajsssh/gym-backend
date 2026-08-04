import express from "express";
import {
  createStaffAttendance,
  deleteStaffAttendance,
  getAllStaffAttendance,
  getStaffAttendanceByBranchId,
  getStaffAttendanceById,
  updateStaffAttendance,
} from "./adminStaffAttendance.controller.js";

const   router = express.Router();

// Create a new staff attendance record
router.post("/", createStaffAttendance);

// Get all staff attendance records with optional filters
router.get("/", getAllStaffAttendance);

// Get staff attendance records by branch ID with optional filters
router.get("/branch/:branchId", getStaffAttendanceByBranchId);

// Get a specific staff attendance record by ID
router.get("/:id", getStaffAttendanceById);

// Update a staff attendance record
router.put("/:id", updateStaffAttendance);

// Delete a staff attendance record
router.delete("/:id", deleteStaffAttendance);

export default router;
