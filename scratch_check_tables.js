import { pool } from "./src/config/db.js";

async function run() {
  try {
    const [roles] = await pool.query("SELECT id, name FROM role");
    console.log("--- ROLES ---");
    console.log(roles);
  } catch (error) {
    console.error("Error inspecting database:", error);
  } finally {
    process.exit(0);
  }
}

run();
