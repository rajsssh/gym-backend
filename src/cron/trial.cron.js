import cron from "node-cron";
import { pool } from "../config/db.js";
import { sendTemplatedNotification } from "../modules/messageTemplates/messageTemplate.service.js";

export const initTrialCronJobs = () => {
  // Run every day at 00:00 (Midnight)
  cron.schedule("0 0 * * *", async () => {
    console.log("Running Daily Trial & Subscription Automation Job...");

    try {
      const today = new Date();

      // 1. Send Daily Expiry Reminders (For users whose trial is expiring today or is in Grace Period)
      const [expiringUsers] = await pool.query(`
        SELECT id, fullName, email, phone, trialEndDate, gracePeriodEndDate, trialStatus 
        FROM user 
        WHERE roleId = 2 
          AND trialStatus IN ('Active', 'Expired')
          AND trialEndDate IS NOT NULL
          AND gracePeriodEndDate >= NOW()
          AND DATE(trialEndDate) <= DATE(NOW())
      `);

      if (expiringUsers.length > 0) {
        for (const user of expiringUsers) {
          // If trial was Active but now end date passed, update to Expired
          if (user.trialStatus === 'Active' && new Date(user.trialEndDate) < today) {
            await pool.query("UPDATE user SET trialStatus = 'Expired' WHERE id = ?", [user.id]);
          }

          console.log(`[AUTOMATION - REMINDER] Dispatched to: ${user.email}`);
          await sendTemplatedNotification({
            eventKey: 'EXPIRY_REMINDER_DAILY',
            tenantId: user.id,
            receiverId: user.id,
            receiverRole: 'Admin',
            receiverEmail: user.email,
            receiverPhone: user.phone,
            variables: {
              Name: user.fullName || "User",
              PlanName: "Free Trial",
              Days: "soon" // or dynamically calculate diff
            },
            referenceType: 'SUBSCRIPTION',
            referenceId: user.id.toString(),
            actionUrl: '/admin/subscription'
          });
        }
      }

      // 2. Automatic Account Deactivation (Grace period ended without conversion)
      const [expiredGracePeriodUsers] = await pool.query(`
        SELECT id, fullName, email 
        FROM user 
        WHERE roleId = 2 
          AND trialStatus = 'Expired'
          AND gracePeriodEndDate < NOW()
          AND status != 'Inactive'
      `);

      if (expiredGracePeriodUsers.length > 0) {
        for (const user of expiredGracePeriodUsers) {
          await pool.query("UPDATE user SET status = 'Inactive' WHERE id = ?", [user.id]);

          console.log(`[AUTOMATION - DEACTIVATED] Dispatched to: ${user.email}`);
          await sendTemplatedNotification({
            eventKey: 'TRIAL_EXPIRED_FINAL',
            tenantId: user.id,
            receiverId: user.id,
            receiverRole: 'Admin',
            receiverEmail: user.email,
            receiverPhone: user.phone,
            variables: {
              Name: user.fullName || "User"
            },
            referenceType: 'SUBSCRIPTION',
            referenceId: user.id.toString(),
            actionUrl: '/login'
          });
        }
      }

    } catch (error) {
      console.error("Error running Daily Trial Automation Job:", error);
    }
  });

  console.log("Trial & Subscription Cron Jobs initialized.");
};
