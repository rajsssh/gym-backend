import { pool } from "../src/config/db.js";
import { getAdminDashboardData } from "../src/modules/auth/auth.service.js";

async function runTest() {
  try {
    const [admins] = await pool.query("SELECT id, fullName, email FROM user WHERE roleId = 2");
    console.log(`Found ${admins.length} gym owners (admins) in database.`);
    
    for (const admin of admins) {
      console.log(`\nTesting dashboard for Admin ID ${admin.id} (${admin.fullName} - ${admin.email})...`);
      try {
        const data = await getAdminDashboardData(admin.id);
        console.log("✅ Dashboard data loaded successfully!");
        console.log("Stats:", {
          totalMembers: data.totalMembers,
          totalStaff: data.totalStaff,
          todaysMemberCheckins: data.todaysMemberCheckins,
          todaysStaffCheckins: data.todaysStaffCheckins,
          recentActivitiesCount: data.recentActivities?.length,
          memberGrowthCount: data.memberGrowth?.length
        });
      } catch (err) {
        console.error(`❌ FAILED for Admin ID ${admin.id}:`, err);
      }
    }
  } catch (error) {
    console.error("Error running verify-dashboard:", error);
  }
  process.exit(0);
}

runTest();
