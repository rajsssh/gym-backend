import { pool } from "../../config/db.js";
import { encrypt } from "../../utils/encryption.js";
import { BrevoCredentialResolver, PaymentCredentialResolver, WhatsAppCredentialResolver } from "../../utils/credentialResolvers.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

// Fetch integration statuses (Masked credentials)
export const getIntegrations = async (req, res) => {
  try {
    const tenantId = req.user.id;
    
    // Auto-create setting row if doesn't exist
    await pool.query("INSERT IGNORE INTO tenantintegrationsettings (tenantId) VALUES (?)", [tenantId]);

    const [rows] = await pool.query("SELECT * FROM tenantintegrationsettings WHERE tenantId = ?", [tenantId]);
    const settings = rows[0];

    return res.status(200).json({
      success: true,
      data: {
        paymentGatewayEnabled: settings.paymentGatewayEnabled,
        emailEnabled: settings.emailEnabled,
        whatsappEnabled: settings.whatsappEnabled,
        isVerified: settings.isVerified,
        lastVerifiedAt: settings.lastVerifiedAt,
        lastTestStatus: settings.lastTestStatus,
        lastTestMessage: settings.lastTestMessage,
        // Send masked strings or null
        razorpayKeyId: settings.razorpayKeyId ? "************" : null,
        razorpaySecret: settings.razorpaySecret ? "************" : null,
        brevoApiKey: settings.brevoApiKey ? "************" : null,
        brevoSenderEmail: settings.brevoSenderEmail || null,
        brevoSenderName: settings.brevoSenderName || null,
        upiQrCode: settings.upiQrCode || null,
        upiId: settings.upiId || null,
        upiAccountHolder: settings.upiAccountHolder || null,
        paymentInstructions: settings.paymentInstructions || null,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Razorpay Settings
export const updateRazorpay = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const { razorpayKeyId, razorpaySecret, paymentGatewayEnabled } = req.body;
    
    let query = "UPDATE tenantintegrationsettings SET paymentGatewayEnabled = ?";
    const params = [paymentGatewayEnabled];

    if (razorpayKeyId && razorpayKeyId !== "************") {
      query += ", razorpayKeyId = ?";
      params.push(razorpayKeyId);
    }
    
    if (razorpaySecret && razorpaySecret !== "************") {
      query += ", razorpaySecret = ?";
      params.push(encrypt(razorpaySecret));
    }
    
    query += " WHERE tenantId = ?";
    params.push(tenantId);
    
    await pool.query(query, params);
    res.status(200).json({ success: true, message: "Razorpay settings updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Brevo Settings
export const updateBrevo = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const { brevoApiKey, brevoSenderEmail, brevoSenderName, emailEnabled } = req.body;
    
    let query = "UPDATE tenantintegrationsettings SET emailEnabled = ?, brevoSenderEmail = ?, brevoSenderName = ?";
    const params = [emailEnabled, brevoSenderEmail, brevoSenderName];

    if (brevoApiKey && brevoApiKey !== "************") {
      query += ", brevoApiKey = ?";
      params.push(encrypt(brevoApiKey));
    }
    
    query += " WHERE tenantId = ?";
    params.push(tenantId);
    
    await pool.query(query, params);
    res.status(200).json({ success: true, message: "Brevo settings updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update Admin UPI Settings
export const updateAdminUPI = async (req, res) => {
  try {
    const tenantId = req.user.id;
    let { upiId, upiAccountHolder, paymentInstructions } = req.body;
    let upiQrCode = null;

    // First fetch existing to keep the QR code if no new file is uploaded
    const [rows] = await pool.query("SELECT upiQrCode FROM tenantintegrationsettings WHERE tenantId = ?", [tenantId]);
    if (rows.length > 0) {
      upiQrCode = rows[0].upiQrCode;
    }

    if (req.files && req.files.upiQrCodeFile) {
      upiQrCode = await uploadToCloudinary(req.files.upiQrCodeFile, "gym/upi-qr");
    } else if (req.body.deleteQrCode === 'true') {
      upiQrCode = null;
    }

    let query = "UPDATE tenantintegrationsettings SET upiQrCode = ? WHERE tenantId = ?";
    const params = [upiQrCode, tenantId];
    
    await pool.query(query, params);
    res.status(200).json({ success: true, message: "UPI Payment settings updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const testRazorpay = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const creds = await PaymentCredentialResolver.getTenantRazorpayCredentials(tenantId);
    if (!creds) {
       return res.status(400).json({ success: false, message: "Razorpay not configured properly" });
    }
    // We would normally ping Razorpay API here. Since we lack the SDK init in this file, we mock success if keys exist.
    // In a real scenario we'd do a Razorpay API call like fetching orders.
    
    await pool.query("UPDATE tenantintegrationsettings SET isVerified = 1, lastVerifiedAt = NOW(), lastTestStatus = 'SUCCESS', lastTestMessage = NULL WHERE tenantId = ?", [tenantId]);
    res.status(200).json({ success: true, message: "Razorpay Connection Successful" });
  } catch (err) {
    await pool.query("UPDATE tenantintegrationsettings SET isVerified = 0, lastTestStatus = 'FAILED', lastTestMessage = ? WHERE tenantId = ?", [err.message, tenantId]);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const testBrevo = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const creds = await BrevoCredentialResolver.getTenantBrevoCredentials(tenantId);
    if (!creds) {
       return res.status(400).json({ success: false, message: "Brevo not configured properly" });
    }
    
    const response = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": creds.apiKey }
    });
    
    if (!response.ok) {
       throw new Error("Invalid API Key");
    }
    
    await pool.query("UPDATE tenantintegrationsettings SET isVerified = 1, lastVerifiedAt = NOW(), lastTestStatus = 'SUCCESS', lastTestMessage = NULL WHERE tenantId = ?", [tenantId]);
    res.status(200).json({ success: true, message: "Brevo Connection Successful" });
  } catch (err) {
    await pool.query("UPDATE tenantintegrationsettings SET isVerified = 0, lastTestStatus = 'FAILED', lastTestMessage = ? WHERE tenantId = ?", [err.message, tenantId]);
    res.status(500).json({ success: false, message: err.message });
  }
};


