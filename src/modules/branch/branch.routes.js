// src/modules/branch/branch.routes.js
import { Router } from "express";
import {
  createBranch,
  listBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  getBranchByAdminId,
  
} from "./branch.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

// Create branch
router.post(
  "/create",
  verifyToken(["Superadmin", "Admin", "Subadmin", "Staff"]),
  createBranch
);

// Get all branches
router.get(
  "/",
  verifyToken(["Superadmin", "Admin", "Subadmin", "Staff"]),
  listBranches
);

router.get(
  "/by-admin/:adminId",
  verifyToken(["Superadmin", "Admin", "Subadmin", "Staff"]),
  getBranchByAdminId
);

// Get single branch
router.get(
  "/:id",
  verifyToken(["Superadmin", "Admin", "Subadmin", "Staff"]),
  getBranchById
);

// Update branch
router.put(
  "/:id",
  verifyToken(["Superadmin", "Admin", "Subadmin", "Staff"]),
  updateBranch
);

// Delete branch
router.delete(
  "/:id", 
  verifyToken(["Superadmin", "Admin", "Subadmin", "Staff"]),
  deleteBranch
);

export default router;
