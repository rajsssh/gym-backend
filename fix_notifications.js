import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "gym_db",
    port: parseInt(process.env.DB_PORT) || 3306,
  })
  .promise();

async function fix() {
  try {
    const newMessage = "Hi {Name}, your subscription for {PlanName} has been successfully activated. Amount Paid: {Amount}";
    await pool.query(
      "UPDATE message_templates SET message = ? WHERE eventKey = 'SUBSCRIPTION_ACTIVATED'",
      [newMessage]
    );
    console.log("Updated message_templates.");

    await pool.query(`
      UPDATE app_notification 
      SET message = REPLACE(REPLACE(message, ' You can now login at http://localhost:5173/login.', ''), '\\\\nAmount Paid', ' Amount Paid')
      WHERE message LIKE '%localhost:5173/login%' OR message LIKE '%\\\\nAmount Paid%'
    `);
    console.log("Fixed old notifications.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

fix();
