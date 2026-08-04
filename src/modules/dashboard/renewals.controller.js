import { pool } from "../../config/db.js";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";

export const getSuperAdminRenewals = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);

    // Format dates for MySQL
    const todayStr = today.toISOString().slice(0, 19).replace('T', ' ');
    const targetDateStr = targetDate.toISOString().slice(0, 19).replace('T', ' ');

    // 1️⃣ Upcoming Renewals
    // roleId = 2 represents Gym Owners/Admins
    const [upcoming] = await pool.query(
      `SELECT 
        id, fullName, email, phone, gymName, subscriptionPlan, licenseExpiryDate, isTrial 
       FROM user 
       WHERE roleId = 2 
         AND licenseExpiryDate >= ? 
         AND licenseExpiryDate <= ?
       ORDER BY licenseExpiryDate ASC`,
      [todayStr, targetDateStr]
    );

    // 2️⃣ Inactive / Expired Renewals
    const [expired] = await pool.query(
      `SELECT 
        id, fullName, email, phone, gymName, subscriptionPlan, licenseExpiryDate, isTrial 
       FROM user 
       WHERE roleId = 2 
         AND licenseExpiryDate < ?
       ORDER BY licenseExpiryDate DESC`,
      [todayStr]
    );

    res.json({
      success: true,
      data: {
        upcomingRenewals: upcoming,
        expiredRenewals: expired
      }
    });
  } catch (err) {
    next(err);
  }
};

export const sendBulkExpiryReminders = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minus3Days = new Date(today);
    minus3Days.setDate(today.getDate() - 3);

    const plus3Days = new Date(today);
    plus3Days.setDate(today.getDate() + 3);

    const startStr = minus3Days.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = plus3Days.toISOString().slice(0, 19).replace('T', ' ');

    const [gyms] = await pool.query(
      `SELECT id, fullName, email, phone, gymName, licenseExpiryDate, isTrial 
       FROM user 
       WHERE roleId = 2 
         AND licenseExpiryDate >= ? 
         AND licenseExpiryDate <= ?`,
      [startStr, endStr]
    );

    if (gyms.length === 0) {
      return res.json({ success: true, count: 0, message: "No gyms found in the -3 to +3 days window." });
    }

    // Attempt to find a specific template if they have one, otherwise fallback
    let subject = "Subscription Expiry Reminder";
    let messageBody = "Your subscription is about to expire or has recently expired. Please renew your plan to ensure uninterrupted access.";
    
    try {
      const [templates] = await pool.query("SELECT * FROM message_templates WHERE eventKey = 'SUBSCRIPTION_EXPIRING' LIMIT 1");
      if (templates.length > 0) {
        subject = templates[0].subject;
        messageBody = templates[0].message;
      }
    } catch (e) {
      console.warn("Failed to fetch template, using default.", e);
    }

    let successCount = 0;

    for (const gym of gyms) {
      try {
        const customMessage = messageBody
          .replace(/{GymName}/g, gym.gymName || "Gym Owner")
          .replace(/{OwnerName}/g, gym.fullName || "User")
          .replace(/{PlanName}/g, gym.isTrial ? '7-Day Free Trial' : (gym.subscriptionPlan || "Your Plan"))
          .replace(/{Date}/g, new Date(gym.licenseExpiryDate).toLocaleDateString());

        await dispatchNotification({
          category: "invoice",
          toEmail: gym.email,
          toPhone: gym.phone,
          toUserId: gym.id,
          subject: subject,
          message: customMessage
        });
        successCount++;
      } catch (err) {
        console.error("Failed to notify gym:", gym.id, err.message);
      }
    }

    res.json({ success: true, count: successCount });
  } catch (err) {
    next(err);
  }
};
