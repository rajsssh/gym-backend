import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import {
  addExpense,
  listExpenses,
  expenseSummary,
} from "./expense.controller.js";

const router = Router();

// Create Expense
router.post(
  "/create",
  verifyToken(["Admin", "Superadmin", "Subadmin", "Manager"]),
  addExpense
);

// List branch expenses
router.get(
  "/branch/:branchId",
  verifyToken(["Admin", "Superadmin", "Subadmin", "Manager"]),
  listExpenses
);

// Monthly summary for graphs
router.get(
  "/summary/:branchId",
  verifyToken(["Admin", "Superadmin", "Subadmin", "Manager"]),
  expenseSummary
);

export default router;
