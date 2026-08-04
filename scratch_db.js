import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "gym_management",
});

async function run() {
  const [rows] = await pool.query(`SHOW TABLES`);
  console.log("Tables:", JSON.stringify(rows, null, 2));
  pool.end();
}
run();
