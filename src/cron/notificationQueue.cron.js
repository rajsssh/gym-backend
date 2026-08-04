import cron from "node-cron";
import { pool } from "../config/db.js";
import { sendTemplatedNotification } from "../modules/messageTemplates/messageTemplate.service.js";

const QUEUE_PROCESS_INTERVAL = process.env.QUEUE_PROCESS_INTERVAL || 10000; // 10s fallback
const QUEUE_BATCH_SIZE = parseInt(process.env.QUEUE_BATCH_SIZE || 100, 10);
const MAX_NOTIFICATION_RETRY = parseInt(process.env.MAX_NOTIFICATION_RETRY || 3, 10);

const processQueue = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Select batch
    const [rows] = await connection.query(
      `SELECT * FROM notification_queue 
       WHERE status = 'PENDING' OR (status = 'RETRYING' AND processAfter <= NOW())
       ORDER BY id ASC
       LIMIT ?`,
      [QUEUE_BATCH_SIZE]
    );

    if (rows.length === 0) {
      connection.release();
      return;
    }

    const ids = rows.map(r => r.id);
    
    // Mark as PROCESSING
    await connection.query(
      `UPDATE notification_queue SET status = 'PROCESSING' WHERE id IN (?)`,
      [ids]
    );

    for (const job of rows) {
      try {
        let variables = {};
        try {
          variables = JSON.parse(job.message);
        } catch(e) {}
        
        const receiverEmail = variables._receiverEmail;
        const receiverPhone = variables._receiverPhone;
        delete variables._receiverEmail;
        delete variables._receiverPhone;

        const result = await sendTemplatedNotification({
          eventKey: job.type,
          tenantId: job.tenantId,
          receiverId: job.receiverId,
          receiverRole: job.receiverRole,
          receiverEmail: receiverEmail,
          receiverPhone: receiverPhone,
          variables: variables,
          referenceType: job.referenceType,
          referenceId: job.referenceId,
          actionUrl: job.actionUrl
        });

        if (result && result.success === false) {
          throw new Error(result.error || result.reason || "Unknown template failure");
        }

        await connection.query(
          `UPDATE notification_queue SET status = 'DELIVERED', updatedAt = NOW() WHERE id = ?`,
          [job.id]
        );
      } catch (err) {
        const nextRetry = job.retryCount + 1;
        if (nextRetry >= MAX_NOTIFICATION_RETRY) {
          await connection.query(
            `UPDATE notification_queue SET status = 'FAILED', retryCount = ?, updatedAt = NOW() WHERE id = ?`,
            [nextRetry, job.id]
          );
        } else {
          // Retry after 5 minutes
          await connection.query(
            `UPDATE notification_queue SET status = 'RETRYING', retryCount = ?, processAfter = DATE_ADD(NOW(), INTERVAL 5 MINUTE), updatedAt = NOW() WHERE id = ?`,
            [nextRetry, job.id]
          );
        }
      }
    }
    
    connection.release();
  } catch (err) {
    if (connection) connection.release();
    console.error("Queue Processing Error:", err);
  }
};

export const initNotificationQueueCron = () => {
  setInterval(processQueue, QUEUE_PROCESS_INTERVAL);
  console.log(`⏳ Notification Queue processor started (Interval: ${QUEUE_PROCESS_INTERVAL}ms, Batch: ${QUEUE_BATCH_SIZE})`);
};
