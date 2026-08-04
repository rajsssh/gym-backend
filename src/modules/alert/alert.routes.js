import { Router } from "express";
// import { verifyToken } from "../../middlewares/auth.js";
import { getAlerts, getVulnerableMembers } from "./alert.controller.js";

const router = Router();

router.get(
  "/",
  // verifyToken(["Admin", "Superadmin"]),
  getAlerts
);

router.get(
  "/vulnerable-members",
  // verifyToken(["Admin", "Superadmin", "Manager"]),
  getVulnerableMembers
);

export default router;
