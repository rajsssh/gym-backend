import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import {
  recordPayment,
  createRazorpayOrder,
  verifyMemberPayment,
  paymentHistory,
  allPayments,
  verifyManualPayment
} from "./payment.controller.js";

const router = Router();

// Record new payment
router.post(
  "/create",
  verifyToken(["Admin", "Superadmin", "receptionist", "Staff"]),
  recordPayment
);

// Create Razorpay Order
router.post(
  "/create-razorpay-order",
  verifyToken(["Admin", "Superadmin", "member", "Staff"]),
  createRazorpayOrder
);

// Verify Razorpay Payment
router.post(
  "/verify-member-payment",
  verifyToken(["Admin", "Superadmin", "member", "Staff"]),
  verifyMemberPayment
);

// Member payment history
router.get(
  "/member/:memberId",
  verifyToken(["Admin", "Superadmin", "receptionist", "member", "Staff"]),
  paymentHistory
);

// All payments of a branch
router.get(
  "/branch/:branchId",
  verifyToken(["Admin", "Superadmin", "receptionist", "Staff"]),
  allPayments
);
// Verify Manual Payment
router.post(
  "/verify-manual",
  verifyToken(["Admin", "Superadmin", "Staff"]),
  verifyManualPayment
);

export default router;
