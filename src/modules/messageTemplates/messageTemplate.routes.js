import express from "express";
import { getAllTemplates, updateTemplate, getTemplateAuditLogs } from "./messageTemplate.controller.js";
import { verifyToken } from "../../middlewares/auth.js";

const router = express.Router();

// Get all message templates (Super Admin)
router.get("/", verifyToken(["SUPERADMIN"]), getAllTemplates);

// Update a message template
router.put("/:id", verifyToken(["SUPERADMIN"]), updateTemplate);

// Get audit logs for a template
router.get("/:id/audit-logs", verifyToken(["SUPERADMIN"]), getTemplateAuditLogs);

export default router;
