import { pool } from "../src/config/db.js";

async function run() {
  try {
    const [rows] = await pool.query("SELECT * FROM user WHERE fullName LIKE '%John%' OR id = 90");
    console.log("--- Admin User Details ---");
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error("Error querying user table:", error);
    process.exit(1);
  }
}

run();
