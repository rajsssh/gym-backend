import { pool } from "../../config/db.js";

// Get Automation Settings
export const getAutomationSettings = async (req, res, next) => {
  try {
    const [settings] = await pool.query("SELECT * FROM automation_settings LIMIT 1");
    res.json({ success: true, settings: settings[0] || {} });
  } catch (err) {
    next(err);
  }
};

// Update Automation Settings
export const updateAutomationSettings = async (req, res, next) => {
  try {
    const { 
      trialDurationDays, 
      gracePeriodDays, 
      enableEmailNotif, 
      enableWhatsappNotif,
      lowCreditThreshold,
      quarterlyDiscount,
      yearlyDiscount
    } = req.body;
    
    await pool.query(`
      UPDATE automation_settings 
      SET trialDurationDays = ?, 
          gracePeriodDays = ?, 
          enableEmailNotif = ?, 
          enableWhatsappNotif = ?,
          lowCreditThreshold = ?,
          quarterlyDiscount = ?,
          yearlyDiscount = ?
    `, [
      trialDurationDays, 
      gracePeriodDays, 
      enableEmailNotif, 
      enableWhatsappNotif,
      lowCreditThreshold || 50,
      quarterlyDiscount || 5.00,
      yearlyDiscount || 15.00
    ]);

    res.json({ success: true, message: "Automation settings updated successfully" });
  } catch (err) {
    next(err);
  }
};

// Get Message Templates
export const getMessageTemplates = async (req, res, next) => {
  try {
    const [templates] = await pool.query("SELECT * FROM message_templates");
    res.json({ success: true, templates });
  } catch (err) {
    next(err);
  }
};

// Update Message Template
export const updateMessageTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, messageBody } = req.body;
    
    await pool.query(`
      UPDATE message_templates 
      SET subject = ?, messageBody = ?
      WHERE id = ?
    `, [subject, messageBody, id]);

    res.json({ success: true, message: "Template updated successfully" });
  } catch (err) {
    next(err);
  }
};
