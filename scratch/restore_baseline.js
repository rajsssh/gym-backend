import mysql from 'mysql2/promise';

const keptEmails = [
  "superadmin@gmail.com",
  "admin@gmail.com",
  "member@gmail.com",
  "generaltrainer1@gym.com",
  "personal@gmail.com",
  "receptionist@gmail.com",
  "salesagent@gmail.com",
  "housekeeping@gmail.com"
];

async function restore() {
  const c = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "gym_new_db",
  });

  try {
    console.log("Starting database baseline restoration...");

    // 1. Get all user IDs that should be deleted
    const [extraUsers] = await c.query(
      "SELECT id, email FROM user WHERE email NOT IN (?)",
      [keptEmails]
    );

    if (extraUsers.length === 0) {
      console.log("Database is already at baseline! No extra users found.");
      return;
    }

    const extraUserIds = extraUsers.map(u => u.id);
    console.log("Found extra users to delete:", extraUsers.map(u => u.email));

    // Disable foreign key checks
    await c.query("SET FOREIGN_KEY_CHECKS = 0");

    // Delete dependent tables for extra users
    await c.query("DELETE FROM salary WHERE staffId IN (SELECT id FROM staff WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM shifts WHERE staffIds IN (SELECT id FROM staff WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM staffattendance WHERE staffId IN (SELECT id FROM staff WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM member_assessments WHERE memberId IN (SELECT id FROM member WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM member_health_log WHERE memberId IN (SELECT id FROM member WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM memberattendance WHERE memberId IN (SELECT id FROM member WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM payment WHERE memberId IN (SELECT id FROM member WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM member_plan_assignment WHERE memberId IN (SELECT id FROM member WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM unified_bookings WHERE memberId IN (SELECT id FROM member WHERE userId IN (?))", [extraUserIds]);
    await c.query("DELETE FROM unified_bookings WHERE trainerId IN (SELECT id FROM staff WHERE userId IN (?))", [extraUserIds]);

    // Reassign leads owned by deleted users to admin 90
    await c.query("UPDATE leads SET adminId = 90 WHERE adminId IN (?)", [extraUserIds]);
    await c.query("UPDATE leads SET assignedToStaffId = NULL WHERE assignedToStaffId IN (SELECT id FROM staff WHERE userId IN (?))", [extraUserIds]);

    // Delete members and staff records
    await c.query("DELETE FROM member WHERE userId IN (?)", [extraUserIds]);
    await c.query("DELETE FROM staff WHERE userId IN (?)", [extraUserIds]);

    // Delete users records
    await c.query("DELETE FROM user WHERE id IN (?)", [extraUserIds]);

    // Re-enable foreign key checks
    await c.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("✅ Baseline restoration successful!");
  } catch (err) {
    console.error("❌ Baseline restoration failed:", err.message);
  } finally {
    await c.end();
  }
}

restore();
