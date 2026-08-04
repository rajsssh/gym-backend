import express from "express";
import {
  generateGeneralTrainerReportController,
  generateMemberReportController,
  generatePersonalTrainerReportController,
  getReceptionReportForAdmin,
  getMemberAttendanceReport,
  getManagerReportController,
  generatePersonalTrainerReportByStaffController,
  generateGeneralTrainerReportByStaffController,
  getAdminHousekeepingReport,
  getStaffHousekeepingReport,
} from "./reports.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = express.Router();

// Generate member report
router.get("/members", verifyToken(["Superadmin", "Admin", "manager"]), generateMemberReportController);
router.get("/personal-trainer", verifyToken(["Superadmin", "Admin", "manager", "personaltrainer"]), generatePersonalTrainerReportController);

// member attendance report
router.get("/attendance/:adminId", verifyToken(["Superadmin", "Admin", "manager", "receptionist"]), getMemberAttendanceReport);

// General trainer report route
router.get("/general-trainer", verifyToken(["Superadmin", "Admin", "manager", "generaltrainer"]), generateGeneralTrainerReportController);
router.get("/reception/:adminId", verifyToken(["Superadmin", "Admin", "manager", "receptionist"]), getReceptionReportForAdmin);
router.get("/manager-report", verifyToken(["Superadmin", "Admin", "manager"]), getManagerReportController);
router.get(
  "/personal-trainer/staff/:adminId/:staffId",
  verifyToken(["Superadmin", "Admin", "manager", "personaltrainer"]),
  generatePersonalTrainerReportByStaffController
);
router.get(
  "/general-trainer/staff/:adminId/:staffId",
  verifyToken(["Superadmin", "Admin", "manager", "generaltrainer"]),
  generateGeneralTrainerReportByStaffController
);
router.get("/housekeeping/admin/:adminId", verifyToken(["Superadmin", "Admin", "manager"]), getAdminHousekeepingReport);

// Get housekeeping report for a specific staff member under an admin
router.get(
  "/housekeeping/admin/:adminId/staff/:staffId",
  verifyToken(["Superadmin", "Admin", "manager", "housekeeping"]),
  getStaffHousekeepingReport
);

export default router;
