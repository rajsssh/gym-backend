import { pool } from "../config/db.js";
import { decrypt } from "./encryption.js";

/**
 * Resolves credentials for Payment Gateway
 */
export const PaymentCredentialResolver = {
  getSuperAdminRazorpayCredentials: () => {
    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
    };
  },

  getTenantRazorpayCredentials: async (tenantId) => {
    if (!tenantId) return null;
    
    const [rows] = await pool.query(
      "SELECT razorpayKeyId, razorpaySecret, paymentGatewayEnabled FROM tenantintegrationsettings WHERE tenantId = ?",
      [tenantId]
    );

    if (rows.length === 0 || !rows[0].paymentGatewayEnabled || !rows[0].razorpayKeyId || !rows[0].razorpaySecret) {
      return null;
    }

    const decryptedSecret = decrypt(rows[0].razorpaySecret);
    if (!decryptedSecret) return null;

    return {
      keyId: rows[0].razorpayKeyId,
      keySecret: decryptedSecret,
    };
  },
};

/**
 * Resolves credentials for Brevo Email Dispatcher
 */
export const BrevoCredentialResolver = {
  getSuperAdminBrevoCredentials: () => {
    return {
      apiKey: process.env.BREVO_API_KEY,
      senderEmail: process.env.MAIL_FROM_EMAIL || process.env.MAIL_FROM || "noreply@gymsoft.com",
      senderName: process.env.MAIL_FROM_NAME || "GymSoft Platform",
    };
  },

  getTenantBrevoCredentials: async (tenantId) => {
    if (!tenantId) return null;

    const [rows] = await pool.query(
      "SELECT brevoApiKey, brevoSenderEmail, brevoSenderName, emailEnabled FROM tenantintegrationsettings WHERE tenantId = ?",
      [tenantId]
    );

    if (rows.length === 0 || !rows[0].emailEnabled || !rows[0].brevoApiKey || !rows[0].brevoSenderEmail) {
      return null;
    }

    const decryptedApiKey = decrypt(rows[0].brevoApiKey);
    if (!decryptedApiKey) return null;

    return {
      apiKey: decryptedApiKey,
      senderEmail: rows[0].brevoSenderEmail,
      senderName: rows[0].brevoSenderName || "GymSoft User",
    };
  },
};

/**
 * Resolves credentials for WhatsApp Cloud API
 */
export const WhatsAppCredentialResolver = {
  getTenantWhatsAppCredentials: async (tenantId) => {
    if (!tenantId) return null;

    const [rows] = await pool.query(
      "SELECT whatsappAccessToken, whatsappPhoneNumberId, whatsappEnabled FROM tenantintegrationsettings WHERE tenantId = ?",
      [tenantId]
    );

    if (rows.length === 0 || !rows[0].whatsappEnabled || !rows[0].whatsappAccessToken || !rows[0].whatsappPhoneNumberId) {
      return null;
    }

    const decryptedToken = decrypt(rows[0].whatsappAccessToken);
    if (!decryptedToken) return null;

    return {
      accessToken: decryptedToken,
      phoneNumberId: rows[0].whatsappPhoneNumberId,
    };
  },
};
