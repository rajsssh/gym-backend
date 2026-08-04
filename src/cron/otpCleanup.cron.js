import cron from "node-cron";
import { pool } from "../config/db.js";

// Run once a day at 3:00 AM
export const initOtpCleanupCron = () => {
  cron.schedule("0 3 * * *", async () => {
    try {
      console.log("🧹 [CRON] Starting OTP cleanup job...");
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const [result] = await pool.query(
        "DELETE FROM password_reset_otp WHERE (isUsed = TRUE OR expiresAt < NOW()) AND createdAt < ?",
        [thirtyDaysAgo]
      );
      
      console.log(`🧹 [CRON] OTP cleanup completed. Deleted ${result.affectedRows} old records.`);
    } catch (error) {
      console.error("❌ [CRON] OTP cleanup failed:", error.message);
    }
  });
  
  console.log("⏰ OTP Cleanup Cron Job Initialized.");
};
