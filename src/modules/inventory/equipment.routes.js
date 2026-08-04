import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import {
  createEquipment,
  listEquipment,
  listEquipmentByAdmin,
  getEquipmentStats,
  getEquipmentStatsByAdmin,
  updateEquipment,
  deleteEquipment,
  createItemRequest,
  listItemRequests,
  updateItemRequestStatus,
  getMemberItemRequests
} from "./equipment.controller.js";

const router = Router();

// ========================
// EQUIPMENT ROUTES
// ========================

// Create equipment (Admin/Manager/Staff)
router.post(
  "/create",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager",
    "PERSONALTRAINER", "GENERALTRAINER", "personaltrainer", "generaltrainer", "personal trainer", "general trainer",
    "RECEPTIONIST", "Receptionist", "receptionist",
    "SALES_AGENT", "Sales Agent", "sales_agent", "salesagent",
    "Staff", "staff"
  ]),
  createEquipment
);

// List all equipment for a branch
router.get(
  "/branch/:branchId",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager",
    "PERSONALTRAINER", "GENERALTRAINER", "personaltrainer", "generaltrainer",
    "RECEPTIONIST", "Receptionist", "receptionist",
    "SALES_AGENT", "Sales Agent", "sales_agent", "salesagent",
    "HOUSEKEEPING", "Staff", "staff"
  ]),
  listEquipment
);

// Equipment stats summary (Admin/Manager/Trainer)
router.get(
  "/stats/:branchId",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager",
    "PERSONALTRAINER", "GENERALTRAINER", "personaltrainer", "generaltrainer",
    "RECEPTIONIST", "Receptionist", "receptionist",
    "SALES_AGENT", "Sales Agent", "sales_agent", "salesagent"
  ]),
  getEquipmentStats
);

// Update equipment
router.put(
  "/update/:id",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager",
    "RECEPTIONIST", "Receptionist", "receptionist",
    "SALES_AGENT", "Sales Agent", "sales_agent"
  ]),
  updateEquipment
);

// Delete equipment (soft delete)
router.delete(
  "/delete/:id",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager"
  ]),
  deleteEquipment
);

// Admin: list all equipment across branches (by adminId)
router.get(
  "/admin/:adminId/list",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager",
    "SALES_AGENT", "Sales Agent", "sales_agent", "salesagent",
    "PERSONALTRAINER", "GENERALTRAINER", "personaltrainer", "generaltrainer",
    "RECEPTIONIST", "Receptionist", "receptionist"
  ]),
  listEquipmentByAdmin
);

// Admin: stats across all branches
router.get(
  "/admin/:adminId/stats",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager",
    "SALES_AGENT", "Sales Agent", "sales_agent", "salesagent",
    "PERSONALTRAINER", "GENERALTRAINER", "personaltrainer", "generaltrainer",
    "RECEPTIONIST", "Receptionist", "receptionist"
  ]),
  getEquipmentStatsByAdmin
);

// ========================
// ITEM REQUEST ROUTES
// ========================

// Create a request (members, trainers, any staff)
router.post(
  "/requests/create",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MEMBER", "Member", "member",
    "PERSONALTRAINER", "GENERALTRAINER", "personaltrainer", "generaltrainer", "personal trainer", "general trainer",
    "RECEPTIONIST", "Receptionist", "receptionist",
    "MANAGER", "Manager", "manager",
    "SALES_AGENT", "Sales Agent", "sales_agent", "salesagent",
    "HOUSEKEEPING", "Staff", "staff"
  ]),
  createItemRequest
);

// Get all requests for admin review
router.get(
  "/requests/admin/:adminId",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager",
    "RECEPTIONIST", "Receptionist", "receptionist",
    "SALES_AGENT", "Sales Agent", "sales_agent", "salesagent"
  ]),
  listItemRequests
);

// Update request status (Approve/Reject/Complete)
router.patch(
  "/requests/:id/status",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MANAGER", "Manager", "manager",
    "RECEPTIONIST", "Receptionist", "receptionist"
  ]),
  updateItemRequestStatus
);

// Get requests submitted by a specific user (member or staff)
router.get(
  "/requests/member/:memberId",
  verifyToken([
    "ADMIN", "Admin", "admin", "SUPERADMIN", "Superadmin", "SuperAdmin",
    "MEMBER", "Member", "member",
    "PERSONALTRAINER", "GENERALTRAINER", "personaltrainer", "generaltrainer",
    "RECEPTIONIST", "Receptionist", "receptionist",
    "MANAGER", "Manager", "manager",
    "HOUSEKEEPING", "SALES_AGENT", "Sales Agent", "sales_agent", "salesagent",
    "Staff", "staff"
  ]),
  getMemberItemRequests
);

export default router;
