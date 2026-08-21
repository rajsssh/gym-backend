import { pool } from "./src/config/db.js";

async function run() {
  const [rows] = await pool.query("DESCRIBE memberattendance");
  console.log(rows);
  const [rows2] = await pool.query("DESCRIBE staffattendance");
  console.log(rows2);
  process.exit(0);
}
run();
