import { pool } from "./src/config/db.js";

async function checkExistence(connection, label) {
  const [[user]] = await connection.query("SELECT * FROM user WHERE id = 163");
  const [[member]] = await connection.query("SELECT * FROM member WHERE id = 156");
  console.log(`[${label}] User 163 exists: ${!!user}, Member 156 exists: ${!!member}`);
}

async function run() {
  const connection = await pool.getConnection();
  try {
    console.log("Starting transactional database cleanup with step-by-step debug logging...");

    // 1. Verify lead count BEFORE transaction
    const [[leadCountBefore]] = await connection.query("SELECT COUNT(*) AS count FROM leads");
    console.log(`Lead count BEFORE cleanup: ${leadCountBefore.count}`);
    if (leadCountBefore.count !== 53) {
      throw new Error(`Expected exactly 53 leads, but got ${leadCountBefore.count}`);
    }

    // 2. Start transaction
    await connection.beginTransaction();
    console.log("Database transaction started.");
    await checkExistence(connection, "Initial State");

    // 3. Unassign deleted staff from leads to prevent foreign key failures
    await connection.query(
      "UPDATE leads SET assignedToStaffId = NULL WHERE assignedToStaffId NOT IN (25, 26, 27, 54)"
    );
    await checkExistence(connection, "After updating leads staffId");

    // 4. Reassign leads of deleted admins to main admin (90) to preserve them
    await connection.query(
      "UPDATE leads SET adminId = 90 WHERE adminId NOT IN (67, 90, 163, 93, 102, 103, 229, 104)"
    );
    await checkExistence(connection, "After updating leads adminId");

    // 5. Delete salary records of deleted staff
    await connection.query("DELETE FROM salary WHERE staffId NOT IN (25, 26, 27, 54)");
    await checkExistence(connection, "After deleting salary");

    // 6. Delete housekeeping attendance for deleted staff/users
    await connection.query(
      "DELETE FROM housekeepingattendance WHERE staffId NOT IN (25, 26, 27, 54) OR createdById NOT IN (67, 90, 163, 93, 102, 103, 229, 104)"
    );
    await checkExistence(connection, "After deleting housekeeping attendance");

    // 7. Delete housekeeping schedule for deleted staff/users
    await connection.query(
      "DELETE FROM housekeepingschedule WHERE staffId NOT IN (25, 26, 27, 54) OR createdById NOT IN (67, 90, 163, 93, 102, 103, 229, 104)"
    );
    await checkExistence(connection, "After deleting housekeeping schedule");

    // 8. Delete staff attendance for deleted staff
    await connection.query("DELETE FROM staffattendance WHERE staffId NOT IN (25, 26, 27, 54)");
    await checkExistence(connection, "After deleting staff attendance");

    // 9. Delete shifts for deleted staff or created by deleted users
    await connection.query(
      "DELETE FROM shifts WHERE staffIds NOT IN (25, 26, 27, 54) OR createdById NOT IN (67, 90, 163, 93, 102, 103, 229, 104)"
    );
    await checkExistence(connection, "After deleting shifts");

    // 10. Delete assessments for deleted members
    await connection.query("DELETE FROM member_assessments WHERE memberId != 156");
    await checkExistence(connection, "After deleting member assessments");

    // 11. Delete health log for deleted members
    await connection.query("DELETE FROM member_health_log WHERE memberId != 156");
    await checkExistence(connection, "After deleting member health log");

    // 12. Delete bodybuilding logs for deleted members
    await connection.query("DELETE FROM member_bodybuilding_logs WHERE memberId != 156");
    await checkExistence(connection, "After deleting member bodybuilding logs");

    // 13. Delete attendance for deleted members
    await connection.query("DELETE FROM memberattendance WHERE memberId != 156");
    await checkExistence(connection, "After deleting member attendance");

    // 14. Delete payments for deleted members
    await connection.query("DELETE FROM payment WHERE memberId != 156");
    await checkExistence(connection, "After deleting payments");

    // 15. Delete bookings for deleted members
    await connection.query("DELETE FROM booking WHERE memberId != 156");
    await checkExistence(connection, "After deleting bookings");

    // 16. Delete booking requests for deleted members
    await connection.query("DELETE FROM booking_requests WHERE memberId != 156");
    await checkExistence(connection, "After deleting booking requests");

    // 17. Delete diet plan assignments for deleted members
    await connection.query("DELETE FROM dietplanassignment WHERE memberId != 156");
    await checkExistence(connection, "After deleting diet plan assignments");

    // 18. Delete workout plan assignments for deleted members
    await connection.query("DELETE FROM workoutplanassignment WHERE memberId != 156");
    await checkExistence(connection, "After deleting workout plan assignments");

    // 19. Delete used qr nonces for deleted members
    await connection.query("DELETE FROM used_qr_nonces WHERE memberId != 156");
    await checkExistence(connection, "After deleting used qr nonces");

    // 20. Delete notification logs for deleted members
    await connection.query("DELETE FROM notificationlog WHERE memberId != 156 AND memberId IS NOT NULL");
    await checkExistence(connection, "After deleting notification logs");

    // 21. Delete renewal requests for deleted members
    await connection.query("DELETE FROM membership_renewal_requests WHERE memberId != 156");
    await checkExistence(connection, "After deleting renewal requests");

    // 22. Delete plan assignments for deleted members
    await connection.query("DELETE FROM member_plan_assignment WHERE memberId != 156");
    await checkExistence(connection, "After deleting member plan assignments");

    // 23. Delete group class bookings for deleted members
    await connection.query("DELETE FROM group_class_bookings WHERE memberId != 156");
    await checkExistence(connection, "After deleting group class bookings");

    // 24. Delete pt bookings for deleted members
    await connection.query("DELETE FROM pt_bookings WHERE memberId != 156");
    await checkExistence(connection, "After deleting pt bookings");

    // 25. Delete unified bookings for deleted members or deleted trainers
    await connection.query(
      "DELETE FROM unified_bookings WHERE memberId != 156 OR trainerId NOT IN (67, 90, 163, 93, 102, 103, 229, 104)"
    );
    await checkExistence(connection, "After deleting unified bookings");

    // 26. Delete class schedules for deleted trainers
    await connection.query("DELETE FROM classschedule WHERE trainerId NOT IN (102, 93) AND trainerId IS NOT NULL");
    await checkExistence(connection, "After deleting class schedules");

    // 27. Delete sessions for deleted trainers
    await connection.query("DELETE FROM session WHERE trainerId NOT IN (102, 93) AND trainerId IS NOT NULL");
    await checkExistence(connection, "After deleting sessions");

    // 28. Delete saas payments for deleted admins
    await connection.query("DELETE FROM saas_payments WHERE adminId NOT IN (67, 90, 163, 93, 102, 103, 229, 104)");
    await checkExistence(connection, "After deleting saas payments");

    // 29. Delete app settings for deleted admins
    await connection.query("DELETE FROM app_settings WHERE adminId NOT IN (67, 90, 163, 93, 102, 103, 229, 104)");
    await checkExistence(connection, "After deleting app settings");

    // 30. Delete tasks assigned to deleted users or created by deleted users
    await connection.query(
      "DELETE FROM tasks WHERE (assignedTo NOT IN (67, 90, 163, 93, 102, 103, 229, 104) AND assignedTo IS NOT NULL) OR createdById NOT IN (67, 90, 163, 93, 102, 103, 229, 104)"
    );
    await checkExistence(connection, "After deleting tasks");

    // 31. Delete alerts for deleted staff or deleted members
    await connection.query(
      "DELETE FROM alert WHERE (staffId NOT IN (67, 90, 163, 93, 102, 103, 229, 104) AND staffId IS NOT NULL) OR (memberId != 156 AND memberId IS NOT NULL)"
    );
    await checkExistence(connection, "After deleting alerts");

    // 32. Clean member plans: assign deleted admins' plans to main admin (90), clear trainer associations for deleted trainers
    await connection.query("UPDATE memberplan SET adminId = 90 WHERE adminId NOT IN (67, 90, 163, 93, 102, 103, 229, 104)");
    await connection.query("UPDATE memberplan SET trainerId = NULL WHERE trainerId NOT IN (102, 93) AND trainerId IS NOT NULL");
    await checkExistence(connection, "After cleaning member plans");

    // 33. Activate member 156 and set their status to Active in member, user, and member_plan_assignment tables
    console.log("Activating member 156...");
    await connection.query(`
      UPDATE member 
      SET planId = 24, 
          membershipFrom = NOW(), 
          membershipTo = DATE_ADD(NOW(), INTERVAL 30 DAY), 
          status = 'Active' 
      WHERE id = 156
    `);
    await connection.query(`
      UPDATE user 
      SET status = 'Active' 
      WHERE id = 163
    `);
    await connection.query(`
      INSERT INTO member_plan_assignment 
        (memberId, planId, membershipFrom, membershipTo, status, assignedAt)
      VALUES 
        (156, 24, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'Active', NOW())
    `);
    await checkExistence(connection, "After activating member");

    // 34. Reset password hashes for keep users to '123456'
    console.log("Resetting passwords for dashboard users to '123456'...");
    const hash = "$2b$10$crhZxB76ZuAWo2BDk1i3AednUk5HK2zm4ApRzkyOvnsn90JPMUxPq"; // Hash of "123456"
    const emailsToReset = [
      "superadmin@gmail.com",
      "member@gmail.com",
      "salesagent@gmail.com",
      "generaltrainer1@gym.com"
    ];
    for (const email of emailsToReset) {
      await connection.query("UPDATE user SET password = ? WHERE email = ?", [hash, email]);
    }
    await checkExistence(connection, "After resetting passwords");

    // 35. Delete extra member records
    await connection.query("DELETE FROM member WHERE id != 156");
    await checkExistence(connection, "After deleting extra members");

    // 36. Delete extra staff records (including duplicate staff ID 55)
    await connection.query("DELETE FROM staff WHERE id NOT IN (25, 26, 27, 54)");
    await checkExistence(connection, "After deleting extra staff");

    // 37. Delete extra user records
    await connection.query("DELETE FROM user WHERE id NOT IN (67, 90, 163, 93, 102, 103, 229, 104)");
    await checkExistence(connection, "After deleting extra users");

    // 38. Verify lead count AFTER operations but BEFORE commit
    const [[leadCountAfter]] = await connection.query("SELECT COUNT(*) AS count FROM leads");
    console.log(`Lead count AFTER cleanup: ${leadCountAfter.count}`);
    if (leadCountAfter.count !== 53) {
      throw new Error(`CRITICAL: Lead count mismatch! Expected 53, but found ${leadCountAfter.count} leads. Rolling back transaction!`);
    }

    // 39. Commit transaction
    await connection.commit();
    console.log("Transaction successfully committed! All changes saved.");

    // 40. Print Final Counts
    const [[userCount]] = await connection.query("SELECT COUNT(*) AS count FROM user");
    const [[staffCount]] = await connection.query("SELECT COUNT(*) AS count FROM staff");
    const [[memberCount]] = await connection.query("SELECT COUNT(*) AS count FROM member");
    const [[leadCount]] = await connection.query("SELECT COUNT(*) AS count FROM leads");

    console.log("\n--- FINAL COUNTS ---");
    console.log(`Users remaining: ${userCount.count} (Expected: 8)`);
    console.log(`Staff remaining: ${staffCount.count} (Expected: 4)`);
    console.log(`Members remaining: ${memberCount.count} (Expected: 1)`);
    console.log(`Leads remaining: ${leadCount.count} (Expected: 53)`);

  } catch (error) {
    console.error("Cleanup failed. Rolling back transaction...", error);
    await connection.rollback();
  } finally {
    connection.release();
    process.exit(0);
  }
}

run();
