import { pool } from "../src/config/db.js";

async function run() {
  try {
    const [staff] = await pool.query(
      `SELECT staff.id as staffId, staff.userId, staff.adminId, staff.branchId, user.fullName, user.email, user.roleId 
       FROM staff 
       JOIN user ON staff.userId = user.id 
       WHERE staff.adminId = 90 OR staff.userId IN (SELECT id FROM user WHERE adminId = 90)`
    );
    console.log("STAFF FOR ADMIN 90:", staff);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
