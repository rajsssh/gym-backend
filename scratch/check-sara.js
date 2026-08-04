import { pool } from "../src/config/db.js";

async function run() {
  const [rows] = await pool.query("SELECT * FROM user WHERE email = 'sara@gmail.com'");
  console.log("Sara user details:");
  console.log(rows[0]);
  process.exit(0);
}

run();
