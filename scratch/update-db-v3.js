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

  console.log("Connecting to database to create global_settings table...");
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database successfully.");

    // 1. Create global_settings Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS global_settings (
        key_name VARCHAR(191) PRIMARY KEY,
        value_data TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Table 'global_settings' verified/created.");

    // 2. Seed default values
    const defaultSettings = [
      { key: "welcome_note_channel", val: '["EMAIL"]' },
      { key: "invoice_channel", val: '["EMAIL"]' },
      { key: "templates_channel", val: '["EMAIL"]' }
    ];

    for (const setting of defaultSettings) {
      // Check if key already exists
      const [rows] = await connection.query("SELECT key_name FROM global_settings WHERE key_name = ?", [setting.key]);
      if (rows.length === 0) {
        await connection.query("INSERT INTO global_settings (key_name, value_data) VALUES (?, ?)", [setting.key, setting.val]);
        console.log(`✅ Seeded default setting '${setting.key}' as '${setting.val}'.`);
      } else {
        console.log(`ℹ️ Setting '${setting.key}' already exists in DB.`);
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
