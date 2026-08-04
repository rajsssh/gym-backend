import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "gym_management",
});

async function run() {
  try {
    console.log("Starting DB migration...");
    
    // Check if columns exist before altering to prevent errors on multiple runs
    const [cols] = await pool.query(`SHOW COLUMNS FROM notificationlog LIKE 'receiver_role'`);
    if (cols.length === 0) {
      await pool.query(`
        ALTER TABLE notificationlog
        ADD COLUMN receiver_role VARCHAR(50) DEFAULT NULL,
        ADD COLUMN sender_id INT DEFAULT NULL,
        ADD COLUMN sender_role VARCHAR(50) DEFAULT NULL,
        ADD COLUMN title VARCHAR(255) DEFAULT NULL,
        ADD COLUMN reference_type VARCHAR(100) DEFAULT NULL,
        ADD COLUMN reference_id INT DEFAULT NULL,
        ADD COLUMN is_read BOOLEAN DEFAULT FALSE
      `);
      console.log("Altered notificationlog table successfully.");
    } else {
      console.log("notificationlog table already altered.");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        reference_id INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Created admin_activity_logs table successfully.");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    pool.end();
  }
}

run();
