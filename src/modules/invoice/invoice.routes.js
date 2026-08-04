import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import { generateInvoicePdf } from "./invoice.controller.js";

const router = Router();

// Only Admin, Superadmin, Staff ko invoice dekhne ka access
router.get(
  "/:id",
  verifyToken(["Admin", "Superadmin", "Staff"]),
  generateInvoicePdf
);

export default router;
