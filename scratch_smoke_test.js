import axios from "axios";
import mysql from "mysql2/promise";

const baseURL = "http://localhost:4000/api";

// Test credentials
const credentials = {
  superadmin: { email: "superadmin@gmail.com", password: "123456" },
  admin: { email: "admin@gmail.com", password: "123456" },
  member: { email: "member@gmail.com", password: "123456" },
  generaltrainer: { email: "generaltrainer1@gym.com", password: "123456" },
  personaltrainer: { email: "personal@gmail.com", password: "123456" },
  receptionist: { email: "receptionist@gmail.com", password: "123456" },
  salesagent: { email: "salesagent@gmail.com", password: "123456" },
  housekeeping: { email: "housekeeping@gmail.com", password: "123456" },
};

// Store tokens and user IDs dynamically
const tokens = {};
const userIds = {};

// Keep track of any database ids generated for cleanup
const createdIds = {
  memberIds: [],
  userIds: [],
  staffIds: [],
  leadIds: [],
  attendanceIds: [],
  paymentIds: [],
  assessmentIds: [],
  equipmentRequestIds: [],
  announcementIds: [],
  notificationLogMaxId: 66, // Keep logs from baseline
};

// Database helper
async function getDbConnection() {
  return await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "gym_new_db",
  });
}

async function loginAll() {
  console.log("=== 1. TESTING ROLE-BASED LOGINS (8 ACCOUNTS) ===");
  for (const [role, creds] of Object.entries(credentials)) {
    try {
      const res = await axios.post(`${baseURL}/auth/login`, creds);
      if (res.status === 200 && res.data.token) {
        tokens[role] = res.data.token;
        userIds[role] = res.data.user.id;
        console.log(`✅ Login successful for [${role}] (User ID: ${res.data.user.id})`);
      } else {
        throw new Error(`Invalid status: ${res.status}`);
      }
    } catch (error) {
      console.error(`❌ Login failed for [${role}]:`, error.message);
      throw error;
    }
  }
}

async function runNegativeAuthTests() {
  console.log("\n=== 2. RUNNING NEGATIVE AUTHENTICATION TESTS ===");

  // A. Invalid login credentials
  try {
    console.log("Testing login with invalid credentials...");
    await axios.post(`${baseURL}/auth/login`, { email: "nonexistent@gmail.com", password: "wrongpassword" });
    throw new Error("Invalid login did not fail");
  } catch (error) {
    if (error.response && [400, 401, 403].includes(error.response.status)) {
      console.log(`✅ Invalid login failed as expected (Status: ${error.response.status}, Message: ${error.response.data.message})`);
    } else {
      console.error("❌ Unexpected behavior for invalid login:", error.message);
      throw error;
    }
  }

  // B. Missing JWT token
  try {
    console.log("Testing protected endpoint with missing token...");
    await axios.get(`${baseURL}/members/detail/156`);
    throw new Error("Protected endpoint without token did not fail");
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("✅ Missing token call failed with 401 as expected.");
    } else {
      console.error("❌ Unexpected behavior for missing token:", error.message);
      throw error;
    }
  }

  // C. Expired/Malformed JWT token
  try {
    console.log("Testing protected endpoint with malformed token...");
    await axios.get(`${baseURL}/members/detail/156`, { headers: { Authorization: "Bearer malformed_token_123" } });
    throw new Error("Protected endpoint with malformed token did not fail");
  } catch (error) {
    if (error.response && [401, 403, 500].includes(error.response.status)) {
      console.log(`✅ Malformed token call failed as expected (Status: ${error.response.status})`);
    } else {
      console.error("❌ Unexpected behavior for malformed token:", error.message);
      throw error;
    }
  }
}

async function runNegativeRbacTests() {
  console.log("\n=== 3. RUNNING NEGATIVE RBAC TESTS (UNAUTHORIZED ACCESSIBILITY) ===");

  const memberToken = tokens.member;
  const receptionistToken = tokens.receptionist;
  const housekeepingToken = tokens.housekeeping;
  const salesAgentToken = tokens.salesagent;
  const generalTrainerToken = tokens.generaltrainer;

  // A. Member cannot access Admin/Super Admin endpoints (like listing all staff)
  try {
    console.log("Testing Member accessing staff list...");
    await axios.get(`${baseURL}/staff/admin/90`, { headers: { Authorization: `Bearer ${memberToken}` } });
    throw new Error("Member successfully accessed staff list");
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log("✅ Member access to staff list blocked with 403 as expected.");
    } else {
      console.error("❌ Member access test failed:", error.message);
      throw error;
    }
  }

  // B. Receptionist cannot access assessments write endpoint
  try {
    console.log("Testing Receptionist creating body assessment...");
    await axios.post(
      `${baseURL}/v1/assessments`,
      { memberId: 156, age_at_assessment: 25, gender_at_assessment: "male", weight_kg: 70, height_cm: 175, resting_hr: 60, activity_level: "active", fitness_goal: "fat_loss" },
      { headers: { Authorization: `Bearer ${receptionistToken}` } }
    );
    throw new Error("Receptionist successfully created body assessment");
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log("✅ Receptionist assessment creation blocked with 403 as expected.");
    } else {
      console.error("❌ Receptionist assessment test failed:", error.message);
      throw error;
    }
  }

  // C. Housekeeping cannot view payments history
  try {
    console.log("Testing Housekeeping viewing payment history...");
    await axios.get(`${baseURL}/payments/member/156`, { headers: { Authorization: `Bearer ${housekeepingToken}` } });
    throw new Error("Housekeeping successfully viewed payments history");
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log("✅ Housekeeping payment history access blocked with 403 as expected.");
    } else {
      console.error("❌ Housekeeping payment test failed:", error.message);
      throw error;
    }
  }

  // D. Sales Agent cannot access Payments recording
  try {
    console.log("Testing Sales Agent recording payment...");
    await axios.post(
      `${baseURL}/payments/create`,
      { memberId: 156, planId: 24, amount: 1000, paymentDate: new Date(), invoiceNo: "INV-FAIL", gstPercent: 18 },
      { headers: { Authorization: `Bearer ${salesAgentToken}` } }
    );
    throw new Error("Sales Agent successfully recorded payment");
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log("✅ Sales Agent payment recording blocked with 403 as expected.");
    } else {
      console.error("❌ Sales Agent payment test failed:", error.message);
      throw error;
    }
  }

  // E. Trainer cannot broadcast Super Admin announcements
  try {
    console.log("Testing General Trainer broadcasting superadmin notice...");
    await axios.post(
      `${baseURL}/notif/broadcast`,
      { subject: "Unauthorised announcement", message: "trainer hacked!", channels: ["EMAIL"], targetRoles: ["MEMBERS"] },
      { headers: { Authorization: `Bearer ${generalTrainerToken}` } }
    );
    throw new Error("Trainer successfully broadcasted announcement");
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log("✅ Trainer broadcast blocked with 403 as expected.");
    } else {
      console.error("❌ Trainer broadcast test failed:", error.message);
      throw error;
    }
  }
}

async function testMemberCRUD() {
  console.log("\n=== 4. TESTING MEMBER CRUD ===");
  const adminToken = tokens.admin;
  let testMemberId = null;
  let testUserId = null;

  try {
    // A. Duplicate Member creation check
    console.log("Testing duplicate member creation (using existing member email)...");
    try {
      await axios.post(
        `${baseURL}/members/create`,
        {
          fullName: "Duplicate Member",
          email: "member@gmail.com",
          phone: "9999988888",
          password: "password123",
          gender: "Male",
          dateOfBirth: "1995-05-15",
          joinDate: new Date().toISOString().split("T")[0],
          paymentMode: "Cash",
          interestedIn: "General Training",
          amountPaid: 1000,
          branchId: 50,
          planId: 24,
          adminId: 90,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error("Duplicate member creation did not fail");
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.message.includes("exists")) {
        console.log(`✅ Duplicate member creation blocked as expected (Message: ${err.response.data.message})`);
      } else {
        throw new Error(`Duplicate member test failed: ${err.message}`);
      }
    }

    // B. Create Member (Happy Path)
    console.log("Creating test member...");
    const createRes = await axios.post(
      `${baseURL}/members/create`,
      {
        fullName: "Smoke Test Member",
        email: "smoke_member@gmail.com",
        phone: "9999988888",
        password: "password123",
        gender: "Female",
        dateOfBirth: "1995-05-15",
        joinDate: new Date().toISOString().split("T")[0],
        paymentMode: "Cash",
        interestedIn: "General Training",
        amountPaid: 1000,
        branchId: 50, // Main branch
        planId: 24, // Basic plan
        adminId: 90, // Pass adminId explicitly
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testMemberId = createRes.data.member.memberId;
    testUserId = createRes.data.member.userId;
    createdIds.memberIds.push(testMemberId);
    createdIds.userIds.push(testUserId);
    console.log(`✅ Member created successfully (Member ID: ${testMemberId}, User ID: ${testUserId})`);

    // C. Get Member Detail
    console.log("Fetching member details...");
    const detailRes = await axios.get(`${baseURL}/members/detail/${testMemberId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Fetched details for: ${detailRes.data.member.fullName}`);

    // D. Update Member
    console.log("Updating member details...");
    await axios.put(
      `${baseURL}/members/update/${testMemberId}`,
      {
        fullName: "Smoke Test Member Updated",
        phone: "9999988887",
        branchId: 50,
        planId: 24,
        adminId: 90,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log("✅ Member updated successfully.");

    // E. Delete (Deactivate) Member
    console.log("Deactivating member...");
    const deleteRes = await axios.delete(`${baseURL}/members/delete/${testMemberId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Member deactivated cleanly. Status message: ${deleteRes.data.message}`);

  } catch (error) {
    console.error("❌ Member CRUD failed:", error.message);
    if (error.response) console.error("Response:", error.response.data);
    throw error;
  }
}

async function testStaffCRUD() {
  console.log("\n=== 5. TESTING STAFF CRUD ===");
  const adminToken = tokens.admin;
  let testStaffId = null;
  let testUserId = null;

  try {
    // A. Create Staff (Happy Path)
    console.log("Creating test staff...");
    const createRes = await axios.post(
      `${baseURL}/staff/create`,
      {
        fullName: "Smoke Test Staff",
        email: "smoke_staff@gmail.com",
        phone: "9876543211",
        password: "password123",
        roleId: 8, // Housekeeping role
        gender: "Male",
        dateOfBirth: "1990-10-10",
        joinDate: new Date().toISOString().split("T")[0],
        adminId: 90, // Pass adminId explicitly
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testUserId = createRes.data.staff.id;
    createdIds.userIds.push(testUserId);
    console.log(`✅ Staff created successfully (User/Staff ID: ${testUserId})`);

    // B. List Staff
    console.log("Listing staff...");
    const listRes = await axios.get(`${baseURL}/staff/admin/90`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const testStaffRow = listRes.data.staff.find(s => s.email === "smoke_staff@gmail.com");
    if (!testStaffRow) {
      throw new Error("Created staff not found in list");
    }
    testStaffId = testStaffRow.staffId;
    createdIds.staffIds.push(testStaffId);
    console.log(`✅ Staff found in list. Staff ID: ${testStaffId}`);

    // C. Get Staff Detail
    console.log("Fetching staff details...");
    const detailRes = await axios.get(`${baseURL}/staff/detail/${testStaffId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Fetched details for: ${detailRes.data.staff.fullName}`);

    // D. Update Staff
    console.log("Updating staff details...");
    await axios.put(
      `${baseURL}/staff/update/${testStaffId}`,
      {
        fullName: "Smoke Test Staff Updated",
        gender: "Male",
        adminId: 90,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log("✅ Staff updated successfully.");

    // E. Delete Staff
    console.log("Deleting staff...");
    const deleteRes = await axios.delete(`${baseURL}/staff/delete/${testStaffId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Staff deleted cleanly. Status message: ${deleteRes.data.message}`);

  } catch (error) {
    console.error("❌ Staff CRUD failed:", error.message);
    if (error.response) console.error("Response:", error.response.data);
    throw error;
  }
}

async function testLeadManagement() {
  console.log("\n=== 6. TESTING LEAD MANAGEMENT ===");
  const receptionistToken = tokens.receptionist;
  let testLeadId = null;

  try {
    // A. Negative Lead creation: Missing required fields
    console.log("Testing Lead creation with missing fields...");
    try {
      await axios.post(
        `${baseURL}/leads`,
        { email: "lead_missing@gmail.com" },
        { headers: { Authorization: `Bearer ${receptionistToken}` } }
      );
      throw new Error("Lead creation without name/phone did not fail");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`✅ Lead creation with missing fields blocked as expected (Status: ${err.response.status})`);
      } else {
        throw new Error(`Lead validation test failed: ${err.message}`);
      }
    }

    // B. Create Lead (Happy Path)
    console.log("Creating test lead...");
    const createRes = await axios.post(
      `${baseURL}/leads`,
      {
        fullName: "Smoke Test Lead",
        phone: "9123456780",
        email: "smoke_lead@gmail.com",
        gender: "Male",
        source: "Website",
        status: "New",
        notes: "Interested in cardio programs",
        adminId: 90,
        branchId: 50,
      },
      { headers: { Authorization: `Bearer ${receptionistToken}` } }
    );
    testLeadId = createRes.data.lead?.id || createRes.data.id;
    createdIds.leadIds.push(testLeadId);
    console.log(`✅ Lead created successfully (Lead ID: ${testLeadId})`);

    // C. Get Leads
    console.log("Fetching leads...");
    const listRes = await axios.get(`${baseURL}/leads/admin/90`, {
      headers: { Authorization: `Bearer ${receptionistToken}` },
    });
    console.log(`✅ Leads list fetched. Total Leads: ${listRes.data.leads.length}`);

    // D. Update Lead
    console.log("Updating lead...");
    await axios.put(
      `${baseURL}/leads/${testLeadId}`,
      {
        fullName: "Smoke Test Lead Updated",
        status: "In Progress",
        notes: "Follow up tomorrow",
        adminId: 90,
      },
      { headers: { Authorization: `Bearer ${receptionistToken}` } }
    );
    console.log("✅ Lead updated successfully.");

  } catch (error) {
    console.error("❌ Lead CRM failed:", error.message);
    if (error.response) console.error("Response:", error.response.data);
    throw error;
  }
}

async function testAttendance() {
  console.log("\n=== 7. TESTING ATTENDANCE ===");
  const adminToken = tokens.admin;

  try {
    // A. Negative check-in: Missing memberId
    console.log("Testing check-in with invalid/missing member ID...");
    try {
      await axios.post(
        `${baseURL}/attendance/member/checkin`,
        { branchId: 50, mode: "Manual" },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error("Attendance checkin with missing ID did not fail");
    } catch (err) {
      if (err.response && [400, 404, 500].includes(err.response.status)) {
        console.log(`✅ Invalid check-in blocked as expected (Status: ${err.response.status})`);
      } else {
        throw new Error(`Attendance validation check failed: ${err.message}`);
      }
    }

    // B. Member Check-in (Happy Path)
    console.log("Checking in member...");
    const checkinRes = await axios.post(
      `${baseURL}/attendance/member/checkin`,
      {
        memberId: 156, // kept member
        branchId: 50,
        mode: "Manual",
        status: "Present",
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const attendanceId = checkinRes.data.attendance?.id || checkinRes.data.id;
    if (attendanceId) createdIds.attendanceIds.push(attendanceId);
    console.log(`✅ Member checked in successfully (Attendance ID: ${attendanceId})`);

    // C. Member Check-out (Happy Path)
    console.log("Checking out member...");
    await axios.post(
      `${baseURL}/attendance/member/checkout`,
      {
        memberId: 156,
        branchId: 50,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log("✅ Member checked out successfully.");

    // D. Fetch Member History
    console.log("Fetching member attendance history...");
    const historyRes = await axios.get(`${baseURL}/attendance/member/history/156`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Attendance history fetched. Record count: ${historyRes.data.list ? historyRes.data.list.length : historyRes.data.length}`);

  } catch (error) {
    console.error("❌ Attendance failed:", error.message);
    if (error.response) console.error("Response:", error.response.data);
    throw error;
  }
}

async function testPayments() {
  console.log("\n=== 8. TESTING PAYMENTS & RENEWAL ===");
  const adminToken = tokens.admin;

  try {
    // A. Negative Payment check: Invalid format / missing values
    console.log("Testing payment creation with missing fields...");
    try {
      await axios.post(
        `${baseURL}/payments/create`,
        { memberId: 156, amount: "invalid_amount" },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      throw new Error("Invalid payment creation did not fail");
    } catch (err) {
      if (err.response && [400, 404, 500].includes(err.response.status)) {
        console.log(`✅ Invalid payment blocked as expected (Status: ${err.response.status})`);
      } else {
        throw new Error(`Payment negative check failed: ${err.message}`);
      }
    }

    // B. Record Payment (Happy Path)
    console.log("Recording payment...");
    const paymentRes = await axios.post(
      `${baseURL}/payments/create`,
      {
        memberId: 156,
        planId: 17, // Use planId 17 (from plan table) to satisfy database foreign key constraints
        amount: 1500,
        paymentDate: new Date().toISOString().split("T")[0],
        invoiceNo: `INV-SMOKE-${Date.now()}`,
        gstPercent: 18,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const paymentId = paymentRes.data.payment?.id || paymentRes.data.id || paymentRes.data.paymentId;
    if (paymentId) createdIds.paymentIds.push(paymentId);
    console.log("✅ Payment recorded successfully.");

    // C. Query Payment History
    console.log("Querying member payment history...");
    const historyRes = await axios.get(`${baseURL}/payments/member/156`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Payments history fetched. Total records: ${historyRes.data.payments ? historyRes.data.payments.length : historyRes.data.length}`);

  } catch (error) {
    console.error("❌ Payments failed:", error.message);
    if (error.response) console.error("Response:", error.response.data);
    throw error;
  }
}

async function testAssessments() {
  console.log("\n=== 9. TESTING ASSESSMENT & LEADERBOARD ===");
  const trainerToken = tokens.generaltrainer;
  const memberToken = tokens.member;

  try {
    // A. Create Assessment (Happy Path)
    console.log("Creating body assessment...");
    const assessmentRes = await axios.post(
      `${baseURL}/v1/assessments`,
      {
        memberId: 156,
        assessment_date: new Date(),
        gender_at_assessment: "male",
        age_at_assessment: 25,
        weight_kg: 75.5,
        height_cm: 180,
        neck_cm: 37,
        waist_cm: 82,
        hip_cm: null,
        resting_hr: 68,
        activity_level: "active",
        fitness_goal: "muscle_gain",
        is_baseline: true,
        createdBy: userIds.generaltrainer,
      },
      { headers: { Authorization: `Bearer ${trainerToken}` } }
    );
    const assessmentId = assessmentRes.data.id;
    if (assessmentId) createdIds.assessmentIds.push(assessmentId);
    console.log("✅ Body assessment created and processed successfully.");

    // B. Fetch Latest Assessment
    console.log("Fetching latest assessment...");
    const latestRes = await axios.get(`${baseURL}/v1/assessments/member/156/latest`, {
      headers: { Authorization: `Bearer ${trainerToken}` },
    });
    console.log(`✅ Fetched latest assessment. Lean Body Mass: ${latestRes.data.metrics ? latestRes.data.metrics.lean_body_mass : latestRes.data.lean_body_mass} kg`);

    // C. Query Leaderboard
    console.log("Querying leaderboard...");
    const lbRes = await axios.get(`${baseURL}/v1/leaderboard?branchId=50&goal=muscle_gain`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    console.log(`✅ Leaderboard fetched successfully. Top member: ${lbRes.data.data?.[0]?.fullName || "N/A"}`);

  } catch (error) {
    console.error("❌ Assessments failed:", error.message);
    if (error.response) console.error("Response:", error.response.data);
    throw error;
  }
}

async function testInventory() {
  console.log("\n=== 10. TESTING INVENTORY ===");
  const adminToken = tokens.admin;
  const receptionistToken = tokens.receptionist;

  try {
    // A. Fetch Equipment List
    console.log("Fetching branch equipment list...");
    const listRes = await axios.get(`${baseURL}/v1/equipment/branch/50`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✅ Equipment list fetched. Count: ${listRes.data.length}`);

    // B. Create Equipment request (Happy Path)
    console.log("Creating item request...");
    const requestRes = await axios.post(
      `${baseURL}/v1/equipment/requests/create`,
      {
        itemName: "Yoga Block",
        category: "Other",
        quantity: 5,
        reason: "Need extra support for stretching",
        branchId: 50,
        adminId: 90,
      },
      { headers: { Authorization: `Bearer ${receptionistToken}` } }
    );
    console.log(`✅ Item request created successfully (Success flag: ${requestRes.data.success})`);

  } catch (error) {
    console.error("❌ Inventory failed:", error.message);
    if (error.response) console.error("Response:", error.response.data);
    throw error;
  }
}

async function testNotifications() {
  console.log("\n=== 11. TESTING NOTIFICATIONS & ANNOUNCEMENTS ===");
  const superadminToken = tokens.superadmin;
  const adminToken = tokens.admin;

  try {
    // A. Broadcast Announcement (Super Admin)
    console.log("Broadcasting system announcement as Super Admin...");
    await axios.post(
      `${baseURL}/notif/broadcast`,
      {
        subject: "System Maintenance Notice",
        message: "The server will undergo maintenance on Saturday at 2 AM.",
        channels: ["EMAIL", "APP_PUSH"],
        targetRoles: ["MEMBERS", "STAFF"],
      },
      { headers: { Authorization: `Bearer ${superadminToken}` } }
    );
    console.log("✅ Announcement broadcast successfully.");

    // B. Fetch Broadcast History
    console.log("Fetching broadcast history...");
    const historyRes = await axios.get(`${baseURL}/notif/broadcast/history`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    console.log(`✅ Broadcast history fetched. Announcements sent: ${(historyRes.data.history || historyRes.data.broadcasts || []).length}`);

    // C. Broadcast Announcement (Admin)
    console.log("Broadcasting branch announcement as Admin...");
    await axios.post(
      `${baseURL}/notif/admin/broadcast`,
      {
        subject: "Weekend Schedule change",
        message: "Gym hours will be extended to 10 PM this Sunday.",
        channels: ["EMAIL"],
        targetAudience: ["MEMBERS"],
        adminId: 90,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log("✅ Admin branch announcement broadcast successfully.");

  } catch (error) {
    console.error("❌ Notifications failed:", error.message);
    if (error.response) console.error("Response:", error.response.data);
    throw error;
  }
}

async function performDatabaseCleanup() {
  console.log("\n=== 12. RUNNING AUTOMATED DATABASE CLEANUP ===");
  const c = await getDbConnection();

  try {
    // A. Delete test Member and related User records
    console.log("Purging test member accounts...");
    await c.query("DELETE FROM member WHERE email = 'smoke_member@gmail.com'");
    await c.query("DELETE FROM user WHERE email = 'smoke_member@gmail.com'");

    // B. Delete test Staff and related User records
    console.log("Purging test staff accounts...");
    await c.query("DELETE FROM staff WHERE userId IN (SELECT id FROM user WHERE email = 'smoke_staff@gmail.com')");
    await c.query("DELETE FROM user WHERE email = 'smoke_staff@gmail.com'");

    // C. Delete test Leads
    console.log("Purging test leads...");
    await c.query("DELETE FROM leads WHERE email = 'smoke_lead@gmail.com'");

    // D. Delete test Attendance records
    console.log("Purging test attendance records...");
    await c.query("DELETE FROM memberattendance WHERE memberId = 156");

    // E. Delete test Payments
    console.log("Purging test payment records...");
    await c.query("DELETE FROM payment WHERE memberId = 156");

    // F. Delete test Assessments
    console.log("Purging test assessments...");
    await c.query("DELETE FROM member_assessments WHERE memberId = 156");

    // G. Delete test Equipment Requests
    console.log("Purging test equipment requests...");
    await c.query("DELETE FROM equipment_requests WHERE id > 1");

    // H. Delete test Announcements and notification logs
    console.log("Purging test announcements and logs...");
    await c.query("DELETE FROM announcement WHERE id > 2");
    await c.query("DELETE FROM notificationlog WHERE id > 66");

    // I. Delete test memberplan 17 and assignments
    console.log("Purging test memberplan 17 and assignments...");
    await c.query("DELETE FROM member_plan_assignment WHERE planId = 17");
    await c.query("DELETE FROM memberplan WHERE id = 17");

    console.log("✅ Database cleanup completed successfully!");
  } catch (err) {
    console.error("❌ Database cleanup failed:", err.message);
  } finally {
    await c.end();
  }
}

async function verifyDatabaseBaseline() {
  console.log("\n=== 13. ASSERTING DATABASE BASELINE STATE ===");
  const c = await getDbConnection();

  try {
    const [users] = await c.query("SELECT COUNT(*) as count FROM user");
    const [staff] = await c.query("SELECT COUNT(*) as count FROM staff");
    const [members] = await c.query("SELECT COUNT(*) as count FROM member");
    const [leads] = await c.query("SELECT COUNT(*) as count FROM leads");
    const [attendance] = await c.query("SELECT COUNT(*) as count FROM memberattendance WHERE memberId = 156");
    const [payments] = await c.query("SELECT COUNT(*) as count FROM payment WHERE memberId = 156");
    const [assessments] = await c.query("SELECT COUNT(*) as count FROM member_assessments WHERE memberId = 156");

    const usersCount = users[0].count;
    const staffCount = staff[0].count;
    const membersCount = members[0].count;
    const leadsCount = leads[0].count;
    const testAttendanceCount = attendance[0].count;
    const testPaymentsCount = payments[0].count;
    const testAssessmentsCount = assessments[0].count;

    console.log(`Assertions:
    - Users remaining: ${usersCount} (Expected: 8)
    - Staff remaining: ${staffCount} (Expected: 4)
    - Members remaining: ${membersCount} (Expected: 1)
    - Leads remaining: ${leadsCount} (Expected: 53)
    - Member 156 Attendance: ${testAttendanceCount} (Expected: 0)
    - Member 156 Payments: ${testPaymentsCount} (Expected: 0)
    - Member 156 Assessments: ${testAssessmentsCount} (Expected: 0)`);

    const checksPassed = 
      usersCount === 8 &&
      staffCount === 4 &&
      membersCount === 1 &&
      leadsCount === 53 &&
      testAttendanceCount === 0 &&
      testPaymentsCount === 0 &&
      testAssessmentsCount === 0;

    if (checksPassed) {
      console.log("✅ SUCCESS: Database has returned completely to its original baseline state!");
    } else {
      throw new Error(`Baseline mismatch: Users=${usersCount}, Staff=${staffCount}, Members=${membersCount}, Leads=${leadsCount}`);
    }

  } catch (err) {
    console.error("❌ Database baseline assertion failed:", err.message);
    throw err;
  } finally {
    await c.end();
  }
}

async function runAll() {
  try {
    console.log("=========================================");
    console.log("Starting Production E2E Smoke Test Suite...");
    console.log("=========================================");
    
    // Ensure memberplan 17 exists for payment recording test
    const c = await getDbConnection();
    const [[plan17]] = await c.query("SELECT * FROM memberplan WHERE id = 17");
    if (!plan17) {
      console.log("[DB SETUP] Inserting memberplan 17 to satisfy database constraints...");
      await c.query("INSERT INTO memberplan (id, name, sessions, validityDays, price, type, adminId, status) VALUES (17, 'Basic', 24, 90, 1200, 'GROUP', 90, 'Active')");
    }
    await c.end();

    await loginAll();
    await runNegativeAuthTests();
    await runNegativeRbacTests();
    await testMemberCRUD();
    await testStaffCRUD();
    await testLeadManagement();
    await testAttendance();
    await testPayments();
    await testAssessments();
    await testInventory();
    await testNotifications();

    // Clean up database records
    await performDatabaseCleanup();

    // Assert original database baseline
    await verifyDatabaseBaseline();

    console.log("\n=========================================");
    console.log("🎉 SUCCESS: ALL PRODUCTION SMOKE TESTS PASSED!");
    console.log("=========================================");
  } catch (error) {
    console.error("\n=========================================");
    console.log("❌ FAILURE: SOME MODULE SMOKE TESTS FAILED!");
    console.log("=========================================");
    
    // Always attempt cleanup even if tests fail to keep DB clean
    await performDatabaseCleanup();
    process.exit(1);
  }
}

runAll();
