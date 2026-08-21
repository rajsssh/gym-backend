import express from "express";
import { verifyToken } from "../../middlewares/auth.js";

import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskByBranchID,
  getTaskAsignedTo,
  getTasksByAdminId,
} from "./housekeepingtask.controller.js";

const router = express.Router();

router.post("/create", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager", "Receptionist"]), createTask);
router.get("/all", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager"]), getAllTasks);
router.get("/:id", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager", "Staff", "GeneralTrainer", "PersonalTrainer", "Receptionist", "SalesAgent"]), getTaskById);
router.get("/branch/:branchId", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager"]), getTaskByBranchID);
router.get("/tasks/admin/:adminId", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager"]), getTasksByAdminId);
router.get("/asignedto/:asignedtoID", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager", "Staff", "GeneralTrainer", "PersonalTrainer", "Receptionist", "SalesAgent"]), getTaskAsignedTo);
router.put("/:id", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager"]), updateTask);
router.put("/status/:id", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager", "Staff", "GeneralTrainer", "PersonalTrainer", "Receptionist", "SalesAgent"]), updateTaskStatus);
router.delete("/:id", verifyToken(["Superadmin", "Admin", "Subadmin", "Manager"]), deleteTask);

export default router;
