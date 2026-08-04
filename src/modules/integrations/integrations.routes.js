import express from "express";
import {
  getIntegrations,
  updateRazorpay,
  updateBrevo,
  testRazorpay,
  testBrevo,
  updateAdminUPI
} from "./integrations.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = express.Router();

// Apply auth middleware to all integration routes (Requires Admin/SuperAdmin)
router.use(verifyToken(["ADMIN", "SUPERADMIN"]));

router.get("/", getIntegrations);

router.put("/razorpay", updateRazorpay);
router.post("/razorpay/test", testRazorpay);

router.put("/brevo", updateBrevo);
router.post("/brevo/test", testBrevo);

router.put("/upi", updateAdminUPI);

export default router;
