import { Router } from "express";
import { getDashboardData, getSuperAdminDashboard, getSalesDashboard, getSuperAdminCRMStats } from "./dashboard.controller.js";
import { getSuperAdminRenewals, sendBulkExpiryReminders } from "./renewals.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

router.get("/dashboard", verifyToken(["Superadmin", "Subadmin"]), getSuperAdminDashboard);
router.get("/crm-stats", verifyToken(["Superadmin", "Subadmin"]), getSuperAdminCRMStats);
router.get("/sales-dashboard", verifyToken(["Superadmin", "Admin", "Subadmin", "sales_agent"]), getSalesDashboard);
router.get("/renewals", verifyToken(["Superadmin", "Subadmin"]), getSuperAdminRenewals);
router.post("/bulk-expiry-reminder", verifyToken(["Superadmin", "Subadmin"]), sendBulkExpiryReminders);
router.get("/", verifyToken(["Superadmin", "Admin", "Subadmin"]), getDashboardData);

export default router;
