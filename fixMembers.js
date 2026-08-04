import { pool } from "./src/config/db.js";

const run = async () => {
  try {
    // Assign 5 recent members to branch 48 so the trainer can see them
    await pool.query("UPDATE member SET branchId = 48 WHERE id IN (149, 148, 147, 146, 127)");
    
    // Also, if 149 doesn't exist, just update the last 5 members
    await pool.query("UPDATE member SET branchId = 48 ORDER BY id DESC LIMIT 5");

    console.log("Updated some members to branch 48 so they show up in the dropdown.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

run();
