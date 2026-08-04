import cron from "node-cron";
import { pool } from "../../config/db.js";
import { sendNotificationService } from "./notif.service.js"; // your email/SMS service

// Schedule: every day at 10:00 AM
cron.schedule("0 10 * * *", async () => {
  try {
    const today = new Date();
    const soon = new Date();
    soon.setDate(today.getDate() + 3); // 3 days ahead

    // Fetch members whose membership expires in the next 3 days
    const [members] = await pool.query(
      `SELECT id, fullName, email 
       FROM member 
       WHERE membershipTo <= ?`,
      [soon]
    );

    for (const m of members) {
      if (!m.email) continue; // skip if no email

      await sendNotificationService({
        type: "EMAIL",
        to: m.email,
        message: `Hi ${m.fullName}, your membership expires soon.`,
        memberId: m.id,
      });
    }

    console.log(`[${new Date().toISOString()}] Membership expiry notifications sent to ${members.length} members.`);
  } catch (err) {
    console.error("Error sending membership notifications:", err);
  }
});
