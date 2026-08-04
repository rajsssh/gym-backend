import { pool } from "../src/config/db.js";

async function run() {
  try {
    const [rows] = await pool.query("SELECT id, fullName, email, phone FROM member");
    console.log("--- Existing Members ---");
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error("Error querying members:", error);
    process.exit(1);
  }
}

run();
