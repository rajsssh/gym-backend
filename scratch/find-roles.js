import { pool } from "../src/config/db.js";

async function run() {
  try {
    const [rows] = await pool.query("SELECT * FROM role");
    console.log("--- Existing Roles ---");
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error("Error querying roles:", error);
    process.exit(1);
  }
}

run();
