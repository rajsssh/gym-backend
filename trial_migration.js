import { pool } from "./src/config/db.js";

async function runMigration() {
  try {
    // 1. Add Trial Columns to User table
    console.log("Adding trial columns to user table...");
    try {
      await pool.query(`ALTER TABLE user 
        ADD COLUMN trialStartDate DATETIME DEFAULT NULL,
        ADD COLUMN trialEndDate DATETIME DEFAULT NULL,
        ADD COLUMN trialStatus ENUM('Active', 'Expired', 'Converted', 'None') DEFAULT 'None',
        ADD COLUMN gracePeriodEndDate DATETIME DEFAULT NULL;
      `);
      console.log("Added trial columns to user table.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Trial columns already exist in user table.");
      } else {
        throw e;
      }
    }

    // 2. Create Automation Settings Table
    console.log("Creating automation_settings table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        trialDurationDays INT DEFAULT 7,
        gracePeriodDays INT DEFAULT 3,
        enableEmailNotif BOOLEAN DEFAULT false,
        enableWhatsappNotif BOOLEAN DEFAULT false,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert default settings if empty
    const [settings] = await pool.query("SELECT id FROM automation_settings");
    if (settings.length === 0) {
      await pool.query("INSERT INTO automation_settings (trialDurationDays, gracePeriodDays) VALUES (7, 3)");
    }
    console.log("automation_settings table ready.");

    // 3. Add UPI and Manual Payment Columns
    console.log("Adding manual payment columns to tenantintegrationsettings and payment tables...");
    try {
      await pool.query(`ALTER TABLE payment 
        ADD COLUMN paymentMode VARCHAR(50) DEFAULT 'Cash',
        ADD COLUMN transactionId VARCHAR(100) DEFAULT NULL,
        ADD COLUMN paymentProofImage VARCHAR(500) DEFAULT NULL,
        ADD COLUMN status VARCHAR(50) DEFAULT 'Approved',
        ADD COLUMN rejectionRemarks TEXT DEFAULT NULL;
      `);
      console.log("Added payment columns.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Payment columns already exist.");
      } else {
        throw e;
      }
    }

    try {
      await pool.query(`ALTER TABLE tenantintegrationsettings 
        ADD COLUMN upiQrCode VARCHAR(500) DEFAULT NULL,
        ADD COLUMN upiId VARCHAR(255) DEFAULT NULL,
        ADD COLUMN upiAccountHolder VARCHAR(255) DEFAULT NULL,
        ADD COLUMN paymentInstructions TEXT DEFAULT NULL;
      `);
      console.log("Added upi columns to tenantintegrationsettings.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("UPI columns already exist in tenantintegrationsettings.");
      } else {
        throw e;
      }
    }

    // 4. (Removed) Message Templates Table creation is now handled by src/config/db.js

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
