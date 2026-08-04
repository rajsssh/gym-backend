import cron from "node-cron";
import { pool } from "../config/db.js";

const NOTIFICATION_RETENTION_DAYS = parseInt(process.env.NOTIFICATION_RETENTION_DAYS || 30, 10);

export const initNotificationCleanupCron = () => {
  cron.schedule("0 2 * * *", async () => {
    console.log(`🧹 Running Nightly Notification Cleanup & Archiving Job... (Retention: ${NOTIFICATION_RETENTION_DAYS} days)`);
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // We must first capture the IDs to delete
      const [oldRows] = await connection.query(`
        SELECT id FROM app_notification 
        WHERE isRead = TRUE AND createdAt < NOW() - INTERVAL ? DAY
      `, [NOTIFICATION_RETENTION_DAYS]);

      if (oldRows.length > 0) {
        const oldIds = oldRows.map(r => r.id);

        // 1. Move old read notifications to archive
        await connection.query(`
          INSERT IGNORE INTO app_notification_archive (
            id, tenantId, senderId, receiverId, receiverRole, type, title, message, 
            referenceType, referenceId, actionUrl, metadata, priority, isRead, readAt, createdAt
          )
          SELECT 
            id, tenantId, senderId, receiverId, receiverRole, type, title, message, 
            referenceType, referenceId, actionUrl, metadata, priority, isRead, readAt, createdAt
          FROM app_notification
          WHERE id IN (?)
        `, [oldIds]);

        // 2. Delete logs for these notifications to save space (archive the main notif only)
        await connection.query(`
          DELETE FROM notification_delivery_log WHERE notificationId IN (?)
        `, [oldIds]);

        // 3. Delete from original table
        await connection.query(`
          DELETE FROM app_notification WHERE id IN (?)
        `, [oldIds]);
        
        console.log(`Archived ${oldIds.length} old notifications.`);
      }

      // 4. Cleanup old successful queue records (7 days is enough for logs)
      await connection.query(`
        DELETE FROM notification_queue WHERE status = 'DELIVERED' AND createdAt < NOW() - INTERVAL 7 DAY
      `);

      await connection.commit();
      connection.release();
      console.log("✅ Nightly Notification Cleanup & Archiving successful.");
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("❌ Failed Nightly Notification Cleanup:", err);
    }
  });
};
