import { Router } from "express";
import { getMemberDashboard } from "./memberDashboard.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

// member dashboard by memberId
router.get("/:memberId/dashboard", verifyToken(["Superadmin", "Admin", "member"]), getMemberDashboard);

export default router;
