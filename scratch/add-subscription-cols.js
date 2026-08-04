import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function addSubscriptionColumns() {
  const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "gym_new_db",
    port: parseInt(process.env.DB_PORT) || 3306
  };

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database!");

    // Add licenseExpiryDate column to user table
    try {
      await connection.query(`ALTER TABLE user ADD COLUMN licenseExpiryDate DATETIME NULL`);
      console.log("✅ Added column 'licenseExpiryDate' to 'user' table.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("ℹ️ Column 'licenseExpiryDate' already exists in 'user' table.");
      } else {
        console.error("❌ Error:", e.message);
      }
    }

    // Add subscriptionPlan column to user table (Basic / Growth / Premium)
    try {
      await connection.query(`ALTER TABLE user ADD COLUMN subscriptionPlan VARCHAR(50) NULL DEFAULT 'Basic'`);
      console.log("✅ Added column 'subscriptionPlan' to 'user' table.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("ℹ️ Column 'subscriptionPlan' already exists in 'user' table.");
      } else {
        console.error("❌ Error:", e.message);
      }
    }

    console.log("🎉 Subscription columns update done!");
  } catch (error) {
    console.error("❌ Connection error:", error);
  } finally {
    if (connection) await connection.end();
  }
}

addSubscriptionColumns();
