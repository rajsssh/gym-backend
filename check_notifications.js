import { pool } from "./src/config/db.js";

async function check() {
  const [rows] = await pool.query("SELECT id, tenantId, receiverId, receiverRole, type FROM app_notification ORDER BY id DESC LIMIT 10");
  console.log(rows);
  process.exit(0);
}

check();
