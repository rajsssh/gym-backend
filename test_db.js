import { pool } from "./src/config/db.js";

async function run() {
  const [rows] = await pool.query("DESCRIBE housekeepingtask");
  console.log(rows);
  process.exit(0);
}
run();
