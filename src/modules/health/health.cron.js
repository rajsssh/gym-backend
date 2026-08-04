import cron from "node-cron";
import { pool } from "../../config/db.js";

/**
 * 15-Day Health Checkup Cron Job
 * Runs every day at 12:00 AM (midnight)
 */
export const startHealthCheckupCron = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Running 15-Day Health Checkup Cron Job...");
    try {
      // Find members whose last health log was >= 15 days ago
      // AND who haven't received an IN-APP notification for this cycle yet
      const [dueMembers] = await pool.query(`
        SELECT m.id as memberId, m.fullName, m.adminId, MAX(h.recordedAt) as lastCheckup
        FROM member m
        JOIN member_health_log h ON m.id = h.memberId
        WHERE m.status = 'ACTIVE'
        GROUP BY m.id, m.fullName, m.adminId
        HAVING DATEDIFF(CURRENT_DATE(), MAX(h.recordedAt)) >= 15
      `);

      if (dueMembers.length === 0) {
        console.log("✅ No members due for 15-day checkup.");
        return;
      }

      console.log(`⚠️ Found ${dueMembers.length} members due for checkup.`);

      for (const member of dueMembers) {
        const message = `Checkup Due: 15 days have passed since ${member.fullName}'s last BMI checkup.`;
        
        // Check if an UNREAD notification already exists for this member to prevent spam
        const [existing] = await pool.query(
          `SELECT id FROM notificationlog 
           WHERE type = 'IN-APP' AND status = 'UNREAD' AND memberId = ? AND message = ?`,
          [member.memberId, message]
        );

        if (existing.length === 0) {
          // Create IN-APP notification for Admin/Trainer
          await pool.query(
            `INSERT INTO notificationlog (type, \`to\`, message, memberId, status)
             VALUES (?, ?, ?, ?, ?)`,
            ['IN-APP', member.adminId.toString(), message, member.memberId, 'UNREAD']
          );
        }
      }
    } catch (error) {
      console.error("❌ Error in Health Checkup Cron Job:", error.message);
    }
  });
};
