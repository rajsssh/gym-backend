import { pool } from "../src/config/db.js";

async function main() {
  try {
    const [tables] = await pool.query("SHOW TABLES");
    console.log("Tables in database:", tables.map(t => Object.values(t)[0]));
    
    // Check if there is a table for global settings
    const globalSettingsExists = tables.some(t => {
      const name = Object.values(t)[0].toLowerCase();
      return name.includes("global") || name.includes("system") || name.includes("setting");
    });
    console.log("Global/setting tables found:", globalSettingsExists);
    
    process.exit(0);
  } catch (err) {
    console.error("Error listing tables:", err);
    process.exit(1);
  }
}

main();
