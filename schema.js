import { pool } from "./src/config/db.js";

async function showSchema() {
  try {
    const [user] = await pool.query("DESCRIBE `user`");
    console.log("USER TABLE:", user.map(c => c.Field));
    
    const [booking] = await pool.query("DESCRIBE `booking_requests`");
    console.log("BOOKING TABLE:", booking.map(c => c.Field));
  } catch(err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
showSchema();
