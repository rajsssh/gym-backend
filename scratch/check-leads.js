import { pool } from "../src/config/db.js";

async function run() {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM leads");
    console.log("--- Leads Table Columns ---");
    console.log(columns.map(col => `${col.Field} (${col.Type})`));

    const [rows] = await pool.query("SELECT * FROM leads");
    console.log("--- Existing Leads ---");
    console.log(rows);
    
    process.exit(0);
  } catch (error) {
    console.error("Error querying database:", error);
    process.exit(1);
  }
}

run();
