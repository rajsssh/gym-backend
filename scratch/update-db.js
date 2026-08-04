import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function runUpdate() {
  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "gym_new_db",
    port: parseInt(process.env.DB_PORT) || 3306
  };

  console.log("Connecting to database with config:", {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port
  });

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Successfully connected to database!");

    // 1. Create whatsapp_credit_transactions Table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_credit_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          adminId INT NOT NULL,
          creditsPurchased INT NOT NULL,
          amountPaid DOUBLE NOT NULL,
          paymentStatus VARCHAR(50) NOT NULL,
          transactionId VARCHAR(191) NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("✅ Table 'whatsapp_credit_transactions' verified/created.");
    } catch (e) {
      console.error("❌ Error creating whatsapp_credit_transactions:", e.message);
    }

    // 2. Create marketing_campaigns Table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS marketing_campaigns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          adminId INT NOT NULL,
          campaignName VARCHAR(191) NOT NULL,
          templateMessage TEXT NOT NULL,
          channel VARCHAR(50) NOT NULL,
          recipientCount INT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          scheduledAt DATETIME NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("✅ Table 'marketing_campaigns' verified/created.");
    } catch (e) {
      console.error("❌ Error creating marketing_campaigns:", e.message);
    }

    // 3. Create landing_page_cms Table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS landing_page_cms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          adminId INT NOT NULL,
          heroTitle VARCHAR(255) NULL,
          heroSubtitle VARCHAR(255) NULL,
          bannerUrl VARCHAR(500) NULL,
          featuresJson TEXT NULL,
          testimonialsJson TEXT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("✅ Table 'landing_page_cms' verified/created.");
    } catch (e) {
      console.error("❌ Error creating landing_page_cms:", e.message);
    }

    // 4. Update 'user' table columns
    const userColumns = [
      { name: "permissions", type: "TEXT NULL" },
      { name: "whatsappCredits", type: "INT NOT NULL DEFAULT 0" },
      { name: "isTrial", type: "TINYINT(1) NOT NULL DEFAULT 0" },
      { name: "trialStartDate", type: "DATETIME NULL" },
      { name: "trialEndDate", type: "DATETIME NULL" }
    ];

    for (const col of userColumns) {
      try {
        await connection.query(`ALTER TABLE user ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added column '${col.name}' to 'user' table.`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️ Column '${col.name}' already exists in 'user' table.`);
        } else {
          console.error(`❌ Error adding column '${col.name}' to 'user' table:`, e.message);
        }
      }
    }

    // 5. Update 'member_health_log' table columns
    const healthColumns = [
      { name: "trainerId", type: "INT NULL" },
      { name: "neck_cm", type: "DECIMAL(4,1) NULL" },
      { name: "waist_cm", type: "DECIMAL(4,1) NULL" },
      { name: "hip_cm", type: "DECIMAL(4,1) NULL" },
      { name: "resting_hr", type: "INT NULL" },
      { name: "activity_level", type: "VARCHAR(50) NULL" },
      { name: "fitness_goal", type: "VARCHAR(50) NULL" },
      { name: "notes", type: "TEXT NULL" },
      { name: "dietChart", type: "TEXT NULL" },
      { name: "bmiStatus", type: "VARCHAR(255) NULL" }
    ];

    for (const col of healthColumns) {
      try {
        await connection.query(`ALTER TABLE member_health_log ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added column '${col.name}' to 'member_health_log' table.`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️ Column '${col.name}' already exists in 'member_health_log' table.`);
        } else {
          console.error(`❌ Error adding column '${col.name}' to 'member_health_log' table:`, e.message);
        }
      }
    }

    console.log("🎉 Database updates completed successfully!");
  } catch (error) {
    console.error("❌ Database connection or execution error:", error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runUpdate();
