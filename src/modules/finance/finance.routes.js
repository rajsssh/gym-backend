import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import { getFinanceReport } from "./finance.controller.js";

const router = Router();

// Only Admin + Superadmin can view finance data
router.get(
  "/report/:branchId?",
  verifyToken(["Admin", "Superadmin"]),
  getFinanceReport
);

export default router;
    