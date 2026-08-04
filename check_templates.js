import { pool } from "./src/config/db.js";

async function check() {
  const [rows] = await pool.query("SELECT eventKey, channel FROM message_templates WHERE eventKey IN ('PLAN_UPGRADED', 'SUBSCRIPTION_ACTIVATED')");
  console.log(rows);
  process.exit(0);
}

check();
