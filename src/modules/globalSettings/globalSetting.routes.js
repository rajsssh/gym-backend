import express from "express";
import { verifyToken } from "../../middlewares/auth.js";
import { getGlobalSettings, updateGlobalSettings, getPublicGlobalSettings } from "./globalSetting.controller.js";

const router = express.Router();

// Public endpoint for fetching global settings (like QR code) without auth token
router.get("/public/:adminId", getPublicGlobalSettings);

router.get("/", verifyToken(["Superadmin"]), getGlobalSettings);
router.put("/", verifyToken(["Superadmin"]), updateGlobalSettings);

export default router;
