import { pool } from "../src/config/db.js";

async function main() {
  try {
    const [logs] = await pool.query("SELECT * FROM notificationlog ORDER BY id DESC LIMIT 10");
    console.log("Recent notifications in DB:");
    console.log(logs);

    const [users] = await pool.query("SELECT id, fullName, email FROM user ORDER BY id DESC LIMIT 5");
    console.log("\nRecent users in DB:");
    console.log(users);

    const [settings] = await pool.query("SELECT * FROM global_settings");
    console.log("\nCurrent Global Settings in DB:");
    console.log(settings);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
