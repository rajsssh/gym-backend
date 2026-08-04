import cron from "node-cron";
import { pool } from "../config/db.js";
import { sendPaymentReminder } from "./whatsappHelper.js";
import { startHealthCheckupCron } from "../modules/health/health.cron.js";

export const startWhatsAppCronJobs = () => {
  console.log("⏰ WhatsApp Cron Jobs Initialized");

  // Run everyday at 9:00 AM
  // "0 9 * * *"
  cron.schedule("0 9 * * *", async () => {
    console.log("⏳ [CRON] Running daily payment reminder check...");

    try {
      // Find members whose membership expires in exactly 3 days
      const [expiringMembers] = await pool.query(
        `SELECT m.fullName, m.phone, m.membershipTo, p.name as planName
         FROM member m
         LEFT JOIN memberplan p ON m.planId = p.id
         WHERE m.status = 'Active' 
         AND DATE(m.membershipTo) = DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
      );

      console.log(`Found ${expiringMembers.length} members expiring in 3 days.`);

      for (const member of expiringMembers) {
        if (member.phone) {
          const formattedDate = new Date(member.membershipTo).toLocaleDateString();
          await sendPaymentReminder(member.phone, member.fullName, member.planName || 'Gym', formattedDate);
        }
      }

    } catch (error) {
      console.error("❌ Error in WhatsApp Cron Job:", error);
    }
  });

  startHealthCheckupCron();
};
