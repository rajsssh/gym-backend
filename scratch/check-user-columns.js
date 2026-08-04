import { pool } from "../src/config/db.js";

async function run() {
  try {
    const [columns] = await pool.query("SHOW COLUMNS FROM user");
    console.log("Columns of user table:");
    console.log(columns.map(c => ({ Field: c.Field, Type: c.Type })));
    
    const [subadmins] = await pool.query("SELECT * FROM user WHERE roleId = 9");
    console.log("Subadmins in DB:");
    console.log(subadmins);
  } catch (error) {
    console.error("Error running script:", error);
  }
  process.exit(0);
}

run();
