import { Router } from "express";
import {
  createStaff,
  listStaff,
  staffDetail,
  updateStaff,
  deleteStaff,
  getAllStaff,
  getTrainerById 
} from "./staff.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

/**
 * 👉 Create Staff
 */
router.post(
  "/create",
  verifyToken(["Superadmin", "Admin"]),
  createStaff
);

router.get("/all/:adminId", verifyToken(["Superadmin", "Admin", "receptionist"]), getAllStaff);

router.get(
  "/trainers/:id",
  verifyToken(["Superadmin", "Admin", "Staff"]),
  getTrainerById
);

router.get(
  "/admin/:adminId",
  verifyToken(["Superadmin", "Admin", "receptionist", "sales_agent", "personal trainer", "general trainer", "manager", "Staff"]),
  listStaff
);

/**
 * 👉 Get Single Staff Details
 */
router.get(
  "/detail/:id",
  verifyToken(["Superadmin", "Admin", "Staff"]),
  (req, res, next) => {
    req.checkBranch = true;
    next();
  },
  staffDetail
);

/**
 * 👉 Edit Staff
 */
router.put(
  "/update/:id",
  verifyToken(["Superadmin", "Admin"]),
  updateStaff
);

/**
 * 👉 Soft Delete / Delete Staff
 */
router.delete(
  "/delete/:id",
  verifyToken(["Superadmin", "Admin"]),
  deleteStaff
);

export default router;
