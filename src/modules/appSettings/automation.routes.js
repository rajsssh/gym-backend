import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import {
  getAutomationSettings,
  updateAutomationSettings,
  getMessageTemplates,
  updateMessageTemplate
} from "./automation.controller.js";

const router = Router();

// GET settings is public so Landing Page can fetch discount percentages
router.get("/settings", getAutomationSettings);
router.put("/settings", verifyToken(["Superadmin", "Subadmin"]), updateAutomationSettings);

router.get("/templates", verifyToken(["Superadmin", "Subadmin"]), getMessageTemplates);
router.put("/templates/:id", verifyToken(["Superadmin", "Subadmin"]), updateMessageTemplate);

export default router;
