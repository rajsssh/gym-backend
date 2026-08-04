import { getGlobalSettingsService, updateGlobalSettingsService } from "./globalSetting.service.js";
import { pool } from "../../config/db.js";

export const getGlobalSettings = async (req, res, next) => {
  try {
    const settings = await getGlobalSettingsService();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
};

export const updateGlobalSettings = async (req, res, next) => {
  try {
    const settings = await updateGlobalSettingsService(req.body);
    res.json({ success: true, message: "Global settings updated successfully", settings });
  } catch (err) {
    next(err);
  }
};

export const getPublicGlobalSettings = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.adminId);
    if (!adminId) {
      return res.status(400).json({ success: false, message: "Admin ID is required" });
    }

    // Fetch the UPI QR Code for this admin from tenantintegrationsettings
    const [rows] = await pool.query("SELECT upiQrCode FROM tenantintegrationsettings WHERE tenantId = ?", [adminId]);
    
    // We can also fetch other "global" settings if they exist, but for now we just return upiQrCode
    const upiQrCode = rows.length > 0 ? rows[0].upiQrCode : null;

    res.json({ success: true, data: { upiQrCode } });
  } catch (err) {
    next(err);
  }
};
