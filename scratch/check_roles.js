import { pool } from "../src/config/db.js";

async function main() {
  try {
    const [roles] = await pool.query("SELECT * FROM role");
    console.log("--- ROLES ---");
    console.log(roles);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
