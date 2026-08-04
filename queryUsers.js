import { pool } from "./src/config/db.js";

async function run() {
  const [rows] = await pool.query("SELECT id, fullName, email, roleId FROM user");
  console.log(rows);
  process.exit(0);
}

run();
