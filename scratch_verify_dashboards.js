import axios from "axios";

const baseURL = "http://localhost:4000/api";

const accounts = [
  { role: "Super Admin", email: "superadmin@gmail.com", password: "123456", dashboardUrl: "/dashboard/dashboard" },
  { role: "Gym Owner (Admin)", email: "admin@gmail.com", password: "123456", dashboardUrl: "/auth/admindashboard/90" },
  { role: "Member (Customer)", email: "member@gmail.com", password: "123456", dashboardUrl: "/member-dashboard/156/dashboard" },
  { role: "General Trainer", email: "generaltrainer1@gym.com", password: "123456", dashboardUrl: "/generaltrainer/dashboard?adminId=90" },
  { role: "Personal Trainer", email: "personal@gmail.com", password: "123456", dashboardUrl: "/personal-trainer-dashboard/trainer/102" },
  { role: "Receptionist", email: "receptionist@gmail.com", password: "123456", dashboardUrl: "/receptionist-dashboard?adminId=90" },
  { role: "Sales Agent", email: "salesagent@gmail.com", password: "123456", dashboardUrl: "/dashboard/sales-dashboard?adminId=90" },
  { role: "Housekeeping", email: "housekeeping@gmail.com", password: "123456", dashboardUrl: "/housekeepingdashboard?adminId=90" },
];

async function verify() {
  console.log("Verifying post-cleanup application functionality...");
  let successCount = 0;

  for (const acc of accounts) {
    try {
      console.log(`\nTesting login for role: [${acc.role}] (${acc.email})`);
      
      const loginRes = await axios.post(`${baseURL}/auth/login`, {
        email: acc.email,
        password: acc.password,
      });

      if (loginRes.status !== 200 || !loginRes.data.token) {
        throw new Error(`Login failed for ${acc.role}. Status: ${loginRes.status}`);
      }

      const token = loginRes.data.token;
      console.log(`✅ Login successful. Received token.`);

      // Verify dashboard endpoint
      console.log(`Testing dashboard load at: ${acc.dashboardUrl}`);
      const dashRes = await axios.get(`${baseURL}${acc.dashboardUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (dashRes.status !== 200) {
        throw new Error(`Dashboard request failed. Status: ${dashRes.status}`);
      }
      console.log(`✅ Dashboard loaded successfully (Status 200).`);
      successCount++;
    } catch (error) {
      console.error(`❌ Verification failed for ${acc.role}:`, error.message);
      if (error.response) {
        console.error("Response data:", error.response.data);
      }
    }
  }

  // Verify staff dropdown contents (to ensure duplicates like Raghu Sharma are gone)
  try {
    console.log("\nVerifying staff list and checking for duplicates...");
    // Log in as Admin to fetch staff list
    const adminLogin = await axios.post(`${baseURL}/auth/login`, {
      email: "admin@gmail.com",
      password: "123456",
    });
    const token = adminLogin.data.token;

    const staffRes = await axios.get(`${baseURL}/staff/admin/90`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (staffRes.status !== 200 || !staffRes.data.success) {
      throw new Error(`Failed to fetch staff list. Status: ${staffRes.status}`);
    }

    const staffList = staffRes.data.staff || [];
    console.log("Current staff in database:", staffList.map(s => `${s.fullName} (${s.email})`));

    if (staffList.length !== 4) {
      console.warn(`⚠️ Warning: Expected 4 staff members, but got ${staffList.length}`);
    }

    // Check for duplicate names/emails
    const names = staffList.map(s => s.fullName.trim());
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      throw new Error(`❌ Duplicate staff name found in staff list: ${names.join(", ")}`);
    } else {
      console.log("✅ No duplicate staff entries found in the list!");
    }
    
  } catch (error) {
    console.error("❌ Staff list verification failed:", error.message);
  }

  console.log(`\nVerification Summary: ${successCount}/${accounts.length} dashboards loaded successfully.`);
  if (successCount === accounts.length) {
    console.log("🎉 ALL DASHBOARDS AND LOGINS VERIFIED SUCCESSFULLY!");
  } else {
    console.error("⚠️ SOME DASHBOARDS FAILED VERIFICATION!");
  }
}

verify();
