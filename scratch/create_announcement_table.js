import { pool } from "../src/config/db.js";

async function main() {
  try {
    // Check if table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'announcement'");
    if (tables.length === 0) {
      console.log("Creating announcement table...");
      await pool.query(`
        CREATE TABLE announcement (
          id INT AUTO_INCREMENT PRIMARY KEY,
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          channels VARCHAR(255) NOT NULL, -- JSON array
          targetRoles VARCHAR(255) NOT NULL, -- JSON array
          sentBy INT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("✅ announcement table created successfully!");
    } else {
      console.log("ℹ️ announcement table already exists.");
    }
  } catch (err) {
    console.error("❌ Error creating table:", err);
  } finally {
    process.exit(0);
  }
}

main();
