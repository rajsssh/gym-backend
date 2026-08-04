import { pool } from "../src/config/db.js";

async function run() {
  try {
    console.log("Adding dietType column to dietplan table...");
    await pool.query("ALTER TABLE dietplan ADD COLUMN dietType VARCHAR(20) DEFAULT 'Any'");
    console.log("Success!");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
        console.log("Column already exists.");
    } else {
        console.error(err);
    }
  } finally {
    process.exit(0);
  }
}
run();
