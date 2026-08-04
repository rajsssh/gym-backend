import { pool } from "../../config/db.js";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";
import { createAppNotification } from "../appNotifications/appNotification.service.js";

// In-memory cache for templates
let templateCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export const getTemplates = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && templateCache && (now - lastCacheTime < CACHE_TTL)) {
    return templateCache;
  }

  const [rows] = await pool.query("SELECT * FROM message_templates");
  
  templateCache = {};
  for (const row of rows) {
    let parsedVars = [];
    try {
      parsedVars = row.variables ? JSON.parse(row.variables) : [];
    } catch (e) {
      parsedVars = [];
    }
    templateCache[row.eventKey] = {
      ...row,
      variables: parsedVars
    };
  }
  
  lastCacheTime = now;
  return templateCache;
};

export const clearTemplateCache = () => {
  templateCache = null;
  lastCacheTime = 0;
};

export const updateTemplateService = async (id, adminId, ipAddress, updateData) => {
  const { subject, message, channel, isActive } = updateData;
  
  // Get old template
  const [oldRows] = await pool.query("SELECT * FROM message_templates WHERE id = ?", [id]);
  if (!oldRows.length) throw new Error("Template not found");
  
  const oldTpl = oldRows[0];
  
  await pool.query(
    "UPDATE message_templates SET subject = ?, message = ?, channel = ?, isActive = ? WHERE id = ?",
    [subject, message, channel, isActive, id]
  );
  
  // Insert audit log
  await pool.query(
    `INSERT INTO template_audit_logs (templateId, adminId, ipAddress, oldSubject, newSubject, oldMessage, newMessage) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, adminId, ipAddress, oldTpl.subject, subject, oldTpl.message, message]
  );
  
  clearTemplateCache();
  return { success: true };
};

export const getTemplateAuditLogsService = async (templateId) => {
  const [rows] = await pool.query(
    `SELECT t.*, u.fullName as adminName 
     FROM template_audit_logs t
     LEFT JOIN user u ON u.id = t.adminId
     WHERE t.templateId = ?
     ORDER BY t.changedAt DESC`,
    [templateId]
  );
  return rows;
};

const replaceVariables = (text, variables) => {
  if (!text) return "";
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{${key}}`, "g");
    result = result.replace(regex, value);
  }
  return result;
};

export const sendTemplatedNotification = async ({
  eventKey,
  tenantId,
  receiverId,
  receiverRole,
  receiverEmail,
  receiverPhone,
  variables = {},
  referenceType = null,
  referenceId = null,
  actionUrl = null
}) => {
  try {
    const templates = await getTemplates();
    const template = templates[eventKey];
    
    if (!template || !template.isActive) {
      return { success: false, reason: "Template not found or inactive" };
    }
    
    const subject = replaceVariables(template.subject, variables);
    const message = replaceVariables(template.message, variables);
    
    const channels = template.channel.split(",").map(c => c.trim().toUpperCase());
    
    // In-App Notification
    if (channels.includes("IN_APP")) {
      createAppNotification({
        tenantId: tenantId || 1, // fallback to Super Admin tenant if null
        receiverId,
        receiverRole,
        type: eventKey,
        title: subject || "Notification",
        message,
        referenceType,
        referenceId,
        actionUrl
      }).catch(err => console.error(`❌ IN_APP failed for ${eventKey}:`, err.message));
    }
    
    // Email / WhatsApp
    let dispatchChannels = [];
    if (channels.includes("EMAIL")) dispatchChannels.push("EMAIL");
    if (channels.includes("WHATSAPP")) dispatchChannels.push("WHATSAPP");
    
    if (dispatchChannels.length > 0) {
      // Define which events are strictly platform-level system emails
      const systemEvents = ['FORGOT_PASSWORD_OTP', 'PLAN_PURCHASED', 'PLAN_UPGRADE_REQUEST', 'SUBSCRIPTION_ACTIVATED'];
      const isSystemEvent = systemEvents.includes(eventKey);

      dispatchNotification({
        category: eventKey.toLowerCase(),
        toEmail: receiverEmail,
        toPhone: receiverPhone,
        toUserId: receiverId,
        subject,
        message,
        customChannels: dispatchChannels,
        isSystemEvent
      }).catch(err => console.error(`❌ Dispatch failed for ${eventKey}:`, err.message));
    }
    
    return { success: true };
  } catch (err) {
    console.error(`❌ sendTemplatedNotification error [${eventKey}]:`, err.message);
    return { success: false, error: err.message };
  }
};
