import { pool } from "./src/config/db.js";

async function fix() {
  try {
    const [result] = await pool.query(
      `UPDATE app_settings SET url = 'mygym' WHERE url = 'localhost:5173'`
    );
    console.log("Updated rows:", result.affectedRows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
