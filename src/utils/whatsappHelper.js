// Removed axios import to prevent crash

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Send a WhatsApp message
 * @param {string} phone - Member's phone number with country code (e.g. "919876543210")
 * @param {string} message - The text message to send
 */
export const sendWhatsAppMessage = async (phone, message, token = null, phoneNumberId = null) => {
  try {
    if (!phone) {
      console.warn("⚠️ WhatsApp Helper: Phone number is missing. Cannot send message.");
      return false;
    }

    console.log(`💬 [WhatsApp API] Triggering send to ${phone}:`);
    console.log(`"${message}"`);

    const activeToken = token || WHATSAPP_TOKEN;
    const activePhoneId = phoneNumberId || PHONE_NUMBER_ID;

    // If credentials are not set, fallback to dummy simulation
    if (!activeToken || !activePhoneId) {
      console.log("ℹ️ WhatsApp credentials not fully configured. Simulating success in Development Mode.");
      return true;
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${activePhoneId}/messages`;
    
    // Clean phone number (leave only digits)
    const cleanPhone = phone.replace(/\D/g, "");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${activeToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: message }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ WhatsApp Meta API Error Response:", data);
      return false;
    }

    console.log("✅ WhatsApp successfully sent via Meta Cloud API!", data);
    return true;
  } catch (error) {
    console.error("❌ WhatsApp Helper Error:", error.message);
    return false;
  }
};

/**
 * Send a Payment Receipt
 */
export const sendPaymentReceipt = async (phone, memberName, amount, planName) => {
  const msg = `Hi ${memberName}, \n\nThank you for your payment of Rs.${amount} for the ${planName} plan. \n\nYour membership is now active. Enjoy your workout! 💪\n\nRegards,\nGym Management`;
  return sendWhatsAppMessage(phone, msg);
};

/**
 * Send a Payment Reminder
 */
export const sendPaymentReminder = async (phone, memberName, planName, dueDate) => {
  const msg = `Hi ${memberName}, \n\nThis is a friendly reminder that your ${planName} gym membership is expiring on ${dueDate}. \n\nPlease renew soon to continue your fitness journey without interruption. \n\nRegards,\nGym Management`;
  return sendWhatsAppMessage(phone, msg);
};
