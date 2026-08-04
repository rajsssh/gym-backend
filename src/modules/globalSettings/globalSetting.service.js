import { pool } from "../../config/db.js";

/**
 * Fetch all global settings and return as a key-value object
 */
export const getGlobalSettingsService = async () => {
  const [rows] = await pool.query("SELECT key_name, value_data FROM global_settings");
  const settingsObj = {};
  
  rows.forEach((row) => {
    try {
      settingsObj[row.key_name] = JSON.parse(row.value_data);
    } catch (e) {
      settingsObj[row.key_name] = row.value_data; // fallback
    }
  });

  return settingsObj;
};

/**
 * Update global settings
 * @param {Object} settings - Key-value pair of settings to update
 */
export const updateGlobalSettingsService = async (settings) => {
  const allowedKeys = ["welcome_note_channel", "invoice_channel", "templates_channel", "free_trial_alert_channel", "saas_renewal_channel"];
  
  for (const [key, val] of Object.entries(settings)) {
    if (!allowedKeys.includes(key)) continue;

    // Value must be an array of strings (e.g. ["EMAIL", "WHATSAPP"])
    if (!Array.isArray(val)) {
      throw { status: 400, message: `Setting value for ${key} must be an array.` };
    }

    // Validate that channels are correct
    const validChannels = ["EMAIL", "WHATSAPP", "APP_PUSH"];
    const hasInvalid = val.some(ch => !validChannels.includes(ch));
    if (hasInvalid) {
      throw { status: 400, message: `Invalid channel. Allowed values: ${validChannels.join(", ")}` };
    }

    const jsonString = JSON.stringify(val);
    await pool.query(
      `INSERT INTO global_settings (key_name, value_data) 
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE value_data = ?`,
      [key, jsonString, jsonString]
    );
  }

  return await getGlobalSettingsService();
};
