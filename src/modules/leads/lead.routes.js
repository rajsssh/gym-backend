import { Router } from "express";
import {
  addLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getSuperAdminLeads,
  getSuperAdminLeadStats,
  addSaasLead,
  getLeadsByStaff,
  bulkAllocateLeads,
  getLeadDistribution,
} from "./lead.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

// Create a new lead
router.post("/", verifyToken(["Superadmin", "Admin", "Subadmin", "receptionist", "sales_agent"]), addLead);

// Bulk allocate unassigned leads to a staff member (Admin only)
router.post("/bulk-allocate", verifyToken(["Superadmin", "Admin", "Subadmin"]), bulkAllocateLeads);

// PUBLIC — Submit a SaaS lead from landing page (no auth required)
router.post("/public/saas", addSaasLead);

// Get all SAAS leads for Super Admin CRM
router.get("/superadmin/all", verifyToken(["Superadmin", "Subadmin"]), getSuperAdminLeads);

// Get SAAS lead stats for Super Admin CRM
router.get("/superadmin/stats", verifyToken(["Superadmin", "Subadmin"]), getSuperAdminLeadStats);

// Get all leads for an admin (Admin/owner view)
router.get("/admin/:adminId", verifyToken(["Superadmin", "Admin", "Subadmin", "receptionist"]), getAllLeads);

// Get lead distribution summary across staff (Admin only)
router.get("/distribution/:adminId", verifyToken(["Superadmin", "Admin", "Subadmin"]), getLeadDistribution);

// Get only assigned leads for a specific staff/sales agent (Clash-Free CRM)
router.get("/staff/:staffId", verifyToken(["Superadmin", "Admin", "Subadmin", "sales_agent", "receptionist"]), getLeadsByStaff);

// Update a lead
router.put("/:id", verifyToken(["Superadmin", "Admin", "Subadmin", "receptionist", "sales_agent"]), updateLead);

// Delete a lead
router.delete("/:id", verifyToken(["Superadmin", "Admin", "Subadmin", "receptionist"]), deleteLead);

export default router;
