import { pool } from "./src/config/db.js";
async function fix() {
  try {
    const [result] = await pool.query("UPDATE user SET smtpHost = NULL, smtpPort = NULL, smtpUser = NULL, smtpPass = NULL");
    console.log("CLEARED", result.affectedRows, "rows");
  } catch (err) {
    console.error(err.message);
  }
  process.exit(0);
}
fix();
