import express from "express";
import { createAppSettingsController, deleteAppSettingsController, getAllAppSettingsController, getAppSettingsByAdminIdController, getAppSettingsByIdController, updateAppSettingsController } from "./appSetting.controller.js";

const router = express.Router();

router.post("/app-settings", createAppSettingsController);
router.get("/app-settings/admin/:adminId", getAppSettingsByAdminIdController);
router.get("/app-settings/:id", getAppSettingsByIdController);
router.get("/app-settings", getAllAppSettingsController);
router.put("/app-settings/:id", updateAppSettingsController);
router.delete("/app-settings/:id", deleteAppSettingsController);

export default router;