import { getTemplates, updateTemplateService, getTemplateAuditLogsService } from "./messageTemplate.service.js";

export const getAllTemplates = async (req, res) => {
  try {
    const templates = await getTemplates();
    res.status(200).json({ success: true, data: Object.values(templates) });
  } catch (error) {
    console.error("Error fetching message templates:", error);
    res.status(500).json({ success: false, message: "Failed to fetch templates" });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message, channel, isActive } = req.body;
    
    // SuperAdmin ID (assuming user is attached to req via auth middleware)
    const adminId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "Subject and message are required" });
    }

    await updateTemplateService(id, adminId, ipAddress, { subject, message, channel, isActive });
    
    res.status(200).json({ success: true, message: "Template updated successfully" });
  } catch (error) {
    console.error("Error updating message template:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update template" });
  }
};

export const getTemplateAuditLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await getTemplateAuditLogsService(id);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching template audit logs:", error);
    res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};
