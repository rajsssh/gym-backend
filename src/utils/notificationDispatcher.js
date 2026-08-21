import { pool } from "../config/db.js";
import { BrevoCredentialResolver, WhatsAppCredentialResolver } from "./credentialResolvers.js";

/**
 * Build styled HTML email
 */
const buildEmailHtml = (subject, message) => {
  // Replace literal '\n' string with actual newlines to support DB stored templates
  const normalizedMessage = message.replace(/\\n/g, '\n');
  const lines = normalizedMessage.split("\n").map(l => {
    const trimmed = l.trim();
    if (!trimmed) return `<div style="height:12px;"></div>`;
    // If the line is an OTP (4 to 8 digits)
    if (/^\d{4,8}$/.test(trimmed)) {
      return `<div style="background:#eef2ff;border:2px dashed #6366f1;border-radius:12px;padding:16px;text-align:center;font-size:32px;font-weight:800;letter-spacing:12px;color:#4f46e5;margin:24px auto;width:max-content;box-shadow:0 4px 6px rgba(99, 102, 241, 0.1);">${trimmed}</div>`;
    }
    return `<p style="margin:8px 0;color:#374151;font-size:16px;line-height:1.6;">${trimmed}</p>`;
  }).join("");
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">💪 GymSoft</h1>
            <p style="margin:4px 0 0;color:#e0e7ff;font-size:13px;">Your Fitness Partner</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#1e1b4b;font-size:18px;">${subject}</h2>
            ${lines}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">This is an automated message from GymSoft Gym Management. Please do not reply.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

/**
 * Send WhatsApp via Meta Cloud API
 * Uses admin's custom token if available, falls back to global .env credentials
 */
const sendWhatsAppViaMetaApi = async (phone, message, customToken = null, customPhoneId = null) => {
  const token = customToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = customPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.warn("⚠️ WhatsApp: No API credentials configured. Skipping.");
    return false;
  }

  const cleanPhone = phone.toString().replace(/\D/g, "");
  if (!cleanPhone || cleanPhone.length < 10) {
    console.warn("⚠️ WhatsApp: Invalid phone number:", phone);
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`❌ WhatsApp Meta API Error for ${cleanPhone}:`, JSON.stringify(data));
      return false;
    }
    console.log(`✅ WhatsApp sent to ${cleanPhone} via Meta Cloud API`);
    return true;
  } catch (err) {
    console.error("❌ WhatsApp API fetch error:", err.message);
    return false;
  }
};

/**
 * Get active channels for a notification category from global_settings table
 */
export const getGlobalNotificationChannels = async (category) => {
  try {
    const keyName = category + "_channel";
    const [rows] = await pool.query(
      "SELECT value_data FROM global_settings WHERE key_name = ?",
      [keyName]
    );
    if (rows.length === 0) return ["EMAIL"];
    return JSON.parse(rows[0].value_data);
  } catch (err) {
    console.error("Error reading global notification settings for " + category + ":", err.message);
    return ["EMAIL"];
  }
};

/**
 * Smart Notification Dispatcher
 * Handles EMAIL (SendGrid), WHATSAPP (Meta Cloud API), IN_APP/APP_PUSH (Bell Icon)
 */
export const dispatchNotification = async ({
  category,
  toEmail,
  toPhone,
  toUserId,
  memberId,
  subject = "GymSoft — Gym Notification",
  message,
  customChannels,
  adminIdForCredits = null,
  isSystemEvent = false
}) => {
  if (!message) {
    console.warn("⚠️ Notification Dispatcher: Message is empty. Skipping.");
    return { success: false, reason: "Message is empty" };
  }

  const activeChannels = customChannels || await getGlobalNotificationChannels(category);
  console.log(`📣 Dispatching '${category}' via channels:`, activeChannels);

  const results = { category, channels: activeChannels, email: null, whatsapp: null, inApp: null };

  // ── Resolve Admin ID for custom credentials ──
  let adminId = adminIdForCredits;
  if (!adminId && memberId) {
    const [memRows] = await pool.query("SELECT adminId FROM member WHERE id = ?", [memberId]);
    if (memRows.length > 0) adminId = memRows[0].adminId;
  }
  if (!adminId && toUserId) {
    const [uRows] = await pool.query("SELECT adminId, roleId, id FROM user WHERE id = ?", [toUserId]);
    if (uRows.length > 0) {
      adminId = uRows[0].roleId === 2 ? uRows[0].id : uRows[0].adminId;
    }
  }

  // ── Load admin's custom credentials using new resolvers ──
  let tenantBrevoCreds = null;
  let isTenantContext = false;
  
  if (adminId && !isSystemEvent) {
    isTenantContext = true;
    tenantBrevoCreds = await BrevoCredentialResolver.getTenantBrevoCredentials(adminId);
  }

  // ════════════════════════════════════════════
  // 1.  EMAIL  →  Brevo HTTP API
  // ════════════════════════════════════════════
  if (activeChannels.includes("EMAIL") && toEmail) {
    try {
      let brevoApiKey = null;
      let mailFrom = null;

      if (isTenantContext) {
        if (!tenantBrevoCreds) {
          throw new Error("Tenant email service is not configured. Please configure Brevo in Settings.");
        }
        brevoApiKey = tenantBrevoCreds.apiKey;
        mailFrom = `${tenantBrevoCreds.senderName} <${tenantBrevoCreds.senderEmail}>`;
      } else {
        const platformCreds = BrevoCredentialResolver.getSuperAdminBrevoCredentials();
        if (!platformCreds.apiKey) {
           throw new Error("Platform BREVO_API_KEY is not configured.");
        }
        brevoApiKey = platformCreds.apiKey;
        mailFrom = `${platformCreds.senderName} <${platformCreds.senderEmail}>`;
      }

      const clean = (val) => (val || "").toString().replace(/['"]/g, '').trim();
      brevoApiKey = clean(brevoApiKey);

      let senderName = "GymSoft";
      let senderEmail = "noreply@gymsoftware.space";
      const match = mailFrom.match(/(.*)<(.*)>/);
      if (match) {
          senderName = match[1].trim();
          senderEmail = match[2].trim();
      } else {
          senderEmail = mailFrom.trim();
      }

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: toEmail }],
          subject: subject,
          htmlContent: buildEmailHtml(subject, message),
          textContent: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json();
      
      console.log("SMTP RESULT:", {
        NotificationType: category,
        Recipient: toEmail,
        Subject: subject,
        MessageId: responseData.messageId || null,
        Status: "Accepted by Brevo API",
        SenderUsed: senderEmail
      });

      await pool.query(
        "INSERT INTO notificationlog (type, `to`, message, memberId, status) VALUES (?, ?, ?, ?, ?)",
        ["EMAIL", toEmail, message, memberId || null, "SENT"]
      );
      results.email = { success: true, messageId: responseData.messageId };
    } catch (err) {
      console.error(`❌ Email failed for ${toEmail}:`, err.message);
      results.email = { success: false, error: err.message };
      await pool.query(
        "INSERT INTO notificationlog (type, `to`, message, memberId, status, error) VALUES (?, ?, ?, ?, ?, ?)",
        ["EMAIL", toEmail, message, memberId || null, "FAILED", err.message]
      ).catch(() => {});
    }
  }

  // ════════════════════════════════════════════
  // 2.  WHATSAPP  (Removed as per request)
  // ════════════════════════════════════════════
  let fallbackToAppPush = false;

  // ════════════════════════════════════════════
  // 3.  IN_APP / APP_PUSH  →  Bell Icon
  // ════════════════════════════════════════════
  const needsInApp =
    activeChannels.includes("APP_PUSH") ||
    activeChannels.includes("IN_APP") ||
    activeChannels.includes("IN-APP") ||
    fallbackToAppPush;

  if (needsInApp && toUserId) {
    try {
      const [result] = await pool.query(
        "INSERT INTO notificationlog (type, `to`, message, memberId, status, is_read) VALUES (?, ?, ?, ?, ?, ?)",
        ["IN-APP", toUserId.toString(), message, memberId || null, "UNREAD", 0]
      );
      results.inApp = { success: true };
      console.log(`🔔 IN_APP notification saved for User ID ${toUserId}`);

      import("../config/socket.js").then(({ getIO, emitToUser }) => {
        const io = getIO();
        if (io) {
          emitToUser(toUserId.toString(), "new_notification", {
            id: result.insertId,
            type: "IN-APP",
            to: toUserId.toString(),
            message: message,
            is_read: 0,
            createdAt: new Date().toISOString()
          });
        }
      });
    } catch (err) {
      console.error(`❌ IN_APP notification failed for User ID ${toUserId}:`, err.message);
      results.inApp = { success: false, error: err.message };
    }
  }

  return { success: true, results };
};
