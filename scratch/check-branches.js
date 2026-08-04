import { pool } from "../src/config/db.js";

async function run() {
  const [rows] = await pool.query("SELECT * FROM branch");
  console.log("Branches in DB:");
  console.log(rows);
  process.exit(0);
}

run();
