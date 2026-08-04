import dotenv from "dotenv";
dotenv.config();

import { pool } from "./src/config/db.js";

const createAppNotificationTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS app_notification (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      senderId INT NULL,
      receiverId INT NOT NULL,
      receiverRole VARCHAR(50) NOT NULL,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      referenceType VARCHAR(100) NULL,
      referenceId VARCHAR(100) NULL,
      actionUrl VARCHAR(255) NULL,
      metadata JSON NULL,
      isRead BOOLEAN DEFAULT FALSE,
      readAt DATETIME NULL,
      priority VARCHAR(50) DEFAULT 'NORMAL',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenantId (tenantId),
      INDEX idx_receiverId (receiverId),
      INDEX idx_receiverRole (receiverRole),
      INDEX idx_createdAt (createdAt),
      INDEX idx_isRead (isRead)
    );
  `;
  try {
    await pool.query(sql);
    console.log("✅ Table app_notification created successfully or already exists.");
  } catch (error) {
    console.error("❌ Error creating app_notification table:", error);
  } finally {
    process.exit();
  }
};

createAppNotificationTable();
