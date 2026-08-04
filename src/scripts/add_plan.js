import { pool } from '../config/db.js';

async function addPlan() {
  try {
    console.log("Altering ENUM...");
    await pool.query("ALTER TABLE plan MODIFY duration ENUM('Monthly', 'Yearly', '7 Days')");
    
    console.log("Inserting plan...");
    await pool.query("INSERT INTO plan (name, duration, price, description, category, status) VALUES ('7-Day Free Trial', '7 Days', 0, '7 Days Free Trial', 'Trial', 'Active')");
    
    console.log("Plan added successfully.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

addPlan();
