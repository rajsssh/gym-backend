import app from "./app.js";
import { ENV } from "./config/env.js";
import "./modules/alert/alert.corn.js";
import "./modules/notifications/notif.corn.js";
import { initTrialCronJobs } from "./cron/trial.cron.js";
import { initNotificationQueueCron } from "./cron/notificationQueue.cron.js";
import { initNotificationCleanupCron } from "./cron/notificationCleanup.cron.js";
import { initOtpCleanupCron } from "./cron/otpCleanup.cron.js";
import { initSocket } from "./config/socket.js";

import { pool } from "./config/db.js";

// Initialize scheduled tasks
initTrialCronJobs();
initNotificationQueueCron();
initNotificationCleanupCron();
initOtpCleanupCron();

(async () => {
  try {
    await pool.query(`ALTER TABLE user 
      ADD COLUMN trialStartDate DATETIME DEFAULT NULL,
      ADD COLUMN trialEndDate DATETIME DEFAULT NULL,
      ADD COLUMN trialStatus ENUM('Active', 'Expired', 'Converted', 'None') DEFAULT 'None',
      ADD COLUMN gracePeriodEndDate DATETIME DEFAULT NULL;
    `);
    console.log("Trial columns added to user table successfully.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log("Trial columns already exist in user table.");
    } else {
      console.error("Failed to add trial columns:", e.message);
    }
  }

  try {
    await pool.query(`ALTER TABLE member 
      ADD COLUMN trainerId INT DEFAULT NULL,
      ADD COLUMN trainerType VARCHAR(255) DEFAULT NULL;
    `);
    console.log("Trainer columns added to member table successfully.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log("Trainer columns already exist in member table.");
    } else {
      console.error("Failed to add trainer columns to member table:", e.message);
    }
  }

  // ─── Ensure equipment tables exist (safe: IF NOT EXISTS) ──────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gym_equipment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NULL,
        quantity INT DEFAULT 1,
        \`condition\` VARCHAR(100) DEFAULT 'Good',
        purchaseDate DATE NULL,
        purchaseCost DECIMAL(10,2) NULL,
        location VARCHAR(255) NULL,
        nextMaintenanceDate DATE NULL,
        branchId INT NOT NULL,
        notes TEXT NULL,
        imageUrl TEXT NULL,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requestedBy INT NOT NULL,
        role VARCHAR(100) DEFAULT 'MEMBER',
        itemName VARCHAR(255) NOT NULL,
        category VARCHAR(255) DEFAULT 'Other',
        quantity INT DEFAULT 1,
        reason TEXT NULL,
        branchId INT NULL,
        adminId INT NULL,
        imageUrl TEXT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        adminRemarks TEXT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Equipment tables ready.");
  } catch (e) {
    console.error("Equipment table setup error:", e.message);
  }
  // ─────────────────────────────────────────────────────────────────────────

  const server = app.listen(ENV.port, () => {
    console.log(`Server running on http://localhost:${ENV.port}`);
  });
  
  // Initialize Socket.io
  initSocket(server);
})();// Checked by akriti
