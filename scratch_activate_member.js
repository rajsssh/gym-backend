import { pool } from "./src/config/db.js";

async function run() {
  try {
    console.log("Activating member 156 (member@gmail.com) with plan 24...");

    // 1. Assign plan and set dates/status in member table
    await pool.query(`
      UPDATE member 
      SET planId = 24, 
          membershipFrom = NOW(), 
          membershipTo = DATE_ADD(NOW(), INTERVAL 30 DAY), 
          status = 'Active' 
      WHERE id = 156
    `);

    // 2. Set status in user table
    await pool.query(`
      UPDATE user 
      SET status = 'Active' 
      WHERE id = 163
    `);

    // 3. Insert assignment row into member_plan_assignment
    await pool.query(`
      INSERT INTO member_plan_assignment 
        (memberId, planId, membershipFrom, membershipTo, status, assignedAt)
      VALUES 
        (156, 24, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'Active', NOW())
    `);

    console.log("✅ Member 156 activated successfully!");

  } catch (error) {
    console.error("Error activating member:", error);
  } finally {
    process.exit(0);
  }
}

run();
