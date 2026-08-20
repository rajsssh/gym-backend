const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Mocks to bypass real Express request/response
let resData = null;
const mockRes = {
  status: (code) => {
    return {
      json: (data) => {
        resData = data;
        return data;
      }
    };
  }
};

async function runTest() {
  console.log("Starting End-to-End Notification Test...");
  const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://root:BVqUcROWCIrVnzhGaSayAJkaetgPkYGJ@tokaido.proxy.rlwy.net:55340/railway');

  try {
    // Dynamically import the ES modules
    const MemberService = await import('./src/modules/member/member.service.js');
    const BodybuildingController = await import('./src/modules/bodybuilding/bodybuilding.controller.js');

    // 0. Cleanup from previous failed runs
    // Get member IDs first to delete logs
    const [existingMembers] = await pool.query("SELECT id FROM member WHERE email IN ('member.a@test.com', 'member.b@test.com')");
    if (existingMembers.length > 0) {
      const ids = existingMembers.map(m => m.id);
      await pool.query("DELETE FROM member_bodybuilding_logs WHERE memberId IN (?)", [ids]);
    }
    await pool.query("DELETE FROM member WHERE email IN ('member.a@test.com', 'member.b@test.com')");
    await pool.query("DELETE FROM user WHERE email IN ('admin.a@test.com', 'trainer.a@test.com', 'trainer.b@test.com', 'member.a@test.com', 'member.b@test.com')");

    // 1. Setup Test Data
    console.log("Creating Test Users...");
    
    // Create Admin
    const [adminRes] = await pool.query("INSERT INTO user (fullName, email, password, roleId, gymName) VALUES ('Admin A', 'admin.a@test.com', 'pass', 2, 'Test Gym')");
    const adminId = adminRes.insertId;

    // Create Trainers (Users)
    const [trainerARes] = await pool.query("INSERT INTO user (fullName, email, password, roleId, adminId) VALUES ('Trainer A', 'trainer.a@test.com', 'pass', 3, ?)", [adminId]);
    const trainerAId = trainerARes.insertId;
    const [trainerBRes] = await pool.query("INSERT INTO user (fullName, email, password, roleId, adminId) VALUES ('Trainer B', 'trainer.b@test.com', 'pass', 3, ?)", [adminId]);
    const trainerBId = trainerBRes.insertId;

    // Create Members (Users + Members)
    const [memberUserARes] = await pool.query("INSERT INTO user (fullName, email, password, roleId, adminId) VALUES ('Member A', 'member.a@test.com', 'pass', 4, ?)", [adminId]);
    const memberUserAId = memberUserARes.insertId;
    const [memberARes] = await pool.query("INSERT INTO member (adminId, userId, fullName, email, phone, goal, dateOfBirth) VALUES (?, ?, 'Member A', 'member.a@test.com', '1111', 'Weight Loss', '1998-01-10')", [adminId, memberUserAId]);
    const memberAId = memberARes.insertId;

    const [memberUserBRes] = await pool.query("INSERT INTO user (fullName, email, password, roleId, adminId) VALUES ('Member B', 'member.b@test.com', 'pass', 4, ?)", [adminId]);
    const memberUserBId = memberUserBRes.insertId;
    const [memberBRes] = await pool.query("INSERT INTO member (adminId, userId, fullName, email, phone, goal, dateOfBirth) VALUES (?, ?, 'Member B', 'member.b@test.com', '2222', 'Muscle Gain', '2002-07-25')", [adminId, memberUserBId]);
    const memberBId = memberBRes.insertId;

    console.log("Test Data Created Successfully.");

    // Clear notifications for clean test
    await pool.query("DELETE FROM app_notification WHERE tenantId = ?", [adminId]);
    await pool.query("DELETE FROM notificationlog");

    // 2. Test Assignment
    console.log("\n--- TEST: Member A -> Trainer A Assignment ---");
    await MemberService.assignTrainerToMemberService({ memberId: memberAId, trainerId: trainerAId, trainerType: 'personal' });

    // Wait 1s for promises to settle
    await new Promise(r => setTimeout(r, 1000));

    // Verify
    const [notifications] = await pool.query("SELECT * FROM app_notification WHERE tenantId = ?", [adminId]);
    
    const trainerANotifs = notifications.filter(n => n.receiverId === trainerAId && n.type === 'TRAINER_ASSIGNED');
    const memberANotifs = notifications.filter(n => n.receiverId === memberUserAId && n.type === 'MEMBER_ASSIGNED_TO_TRAINER');
    const adminNotifs = notifications.filter(n => n.receiverId === adminId && n.type === 'ADMIN_TRAINER_ASSIGNED');
    const trainerBNotifs = notifications.filter(n => n.receiverId === trainerBId);
    
    console.log(`Trainer A Received: ${trainerANotifs.length} (Expected: 1)`);
    console.log(`Member A Received: ${memberANotifs.length} (Expected: 1)`);
    console.log(`Admin Received: ${adminNotifs.length} (Expected: 1)`);
    console.log(`Trainer B Received: ${trainerBNotifs.length} (Expected: 0)`);

    if (trainerANotifs.length === 1 && memberANotifs.length === 1 && adminNotifs.length === 1 && trainerBNotifs.length === 0) {
      console.log("✅ Recipient Isolation and Assignment counts verified.");
    } else {
      console.error("❌ Failed Isolation or Count.");
    }

    // Duplicate Check
    console.log("\n--- TEST: Duplicate Request ---");
    await MemberService.assignTrainerToMemberService({ memberId: memberAId, trainerId: trainerAId, trainerType: 'personal' });
    await new Promise(r => setTimeout(r, 1000));
    
    const [notificationsAfterDup] = await pool.query("SELECT * FROM app_notification WHERE tenantId = ?", [adminId]);
    if (notificationsAfterDup.length === notifications.length) {
      console.log("✅ Duplicate prevention works (No new rows added for immediate identical request).");
    } else {
      console.error(`❌ Duplicate prevention failed! Went from ${notifications.length} to ${notificationsAfterDup.length}`);
    }

    // 3. Test Progress Update
    console.log("\n--- TEST: Bodybuilder Progress Update ---");
    const req = {
      params: { memberId: memberAId },
      body: {
        gender: "Male",
        age: 25,
        weight_kg: 80,
        height_cm: 180,
        neck_cm: 40,
        waist_cm: 80,
        hip_cm: 100,
        fitness_goal: "Hacked Goal", // Should be ignored and forced to "Fat Loss" due to "Weight Loss" profile
        resting_hr: 60
      }
    };

    await BodybuildingController.createLog(req, mockRes);
    await new Promise(r => setTimeout(r, 1000));

    // Data Verification
    if (resData && resData.data && resData.data.fitness_goal === "Fat Loss") {
      console.log("✅ Backend strictly forced canonical Goal ('Fat Loss' mapped from 'Weight Loss') despite hacked payload.");
    } else {
      console.error(`❌ Goal mapping failed! Got ${resData?.data?.fitness_goal}`);
    }

    const [progNotifs] = await pool.query("SELECT * FROM app_notification WHERE type IN ('PROGRESS_UPDATED', 'CLIENT_PROGRESS_UPDATED', 'ADMIN_PROGRESS_UPDATED') AND tenantId = ?", [adminId]);
    
    const progTrainerA = progNotifs.filter(n => n.receiverId === trainerAId);
    const progMemberA = progNotifs.filter(n => n.receiverId === memberUserAId);
    const progAdmin = progNotifs.filter(n => n.receiverId === adminId);
    const progTrainerB = progNotifs.filter(n => n.receiverId === trainerBId);

    console.log(`Progress -> Trainer A: ${progTrainerA.length} (Expected: 1)`);
    console.log(`Progress -> Member A: ${progMemberA.length} (Expected: 1)`);
    console.log(`Progress -> Admin: ${progAdmin.length} (Expected: 1)`);
    console.log(`Progress -> Trainer B: ${progTrainerB.length} (Expected: 0)`);

    if (progTrainerA.length === 1 && progMemberA.length === 1 && progAdmin.length === 1 && progTrainerB.length === 0) {
      console.log("✅ Progress Recipient Isolation verified.");
    }

    console.log("\n--- CLEANUP ---");
    // Cleanup the injected data
    await pool.query("DELETE FROM member_bodybuilding_logs WHERE memberId IN (?, ?)", [memberAId, memberBId]);
    await pool.query("DELETE FROM app_notification WHERE tenantId = ?", [adminId]);
    await pool.query("DELETE FROM member WHERE id IN (?, ?)", [memberAId, memberBId]);
    await pool.query("DELETE FROM user WHERE id IN (?, ?, ?, ?, ?)", [adminId, trainerAId, trainerBId, memberUserAId, memberUserBId]);
    
    console.log("Done!");
    process.exit(0);

  } catch (err) {
    console.error("Test Error:", err);
    process.exit(1);
  }
}

runTest();
