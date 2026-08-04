import { pool } from "../src/config/db.js";
import { createSubAdminService, updateSubAdminService, deleteSubAdminService } from "../src/modules/subadmin/subadmin.service.js";
import { loginUser } from "../src/modules/auth/auth.service.js";

async function runTest() {
  console.log("=== STARTING RBAC INTEGRATION TEST ===");
  const testEmail = "rbac_test_subadmin@gym.com";
  let createdId = null;

  try {
    // 1. Clean up any leftover test data
    await pool.query("DELETE FROM user WHERE email = ?", [testEmail]);

    // 2. Create sub-admin with permissions
    console.log("1. Creating test sub-admin...");
    const testPermissions = ["Dashboard", "Gym Owners", "Setting"];
    const subAdmin = await createSubAdminService({
      fullName: "RBAC Test Assistant",
      email: testEmail,
      phone: "9988776655",
      password: "password123",
      permissions: testPermissions
    });
    
    createdId = subAdmin.id;
    console.log("-> Created sub-admin ID:", createdId);

    // 3. Inspect raw DB value to ensure NO double-stringification
    console.log("2. Inspecting raw database value...");
    const [rows] = await pool.query("SELECT permissions FROM user WHERE id = ?", [createdId]);
    const rawDBPermissions = rows[0].permissions;
    console.log("-> Raw permissions column value in database:", JSON.stringify(rawDBPermissions));

    if (rawDBPermissions === JSON.stringify(testPermissions)) {
      console.log("✅ SUCCESS: Database has clean single-stringified array!");
    } else {
      console.error("❌ FAILURE: Database permissions are still double-stringified or incorrect:", rawDBPermissions);
    }

    // 4. Update sub-admin permissions
    console.log("3. Updating sub-admin permissions...");
    const updatedPermissions = ["Dashboard", "Payments"];
    const updatedSub = await updateSubAdminService(createdId, {
      fullName: "RBAC Test Assistant (Updated)",
      permissions: updatedPermissions
    });
    
    const [rows2] = await pool.query("SELECT permissions FROM user WHERE id = ?", [createdId]);
    const rawDBPermissions2 = rows2[0].permissions;
    console.log("-> Raw permissions after update:", JSON.stringify(rawDBPermissions2));
    
    if (rawDBPermissions2 === JSON.stringify(updatedPermissions)) {
      console.log("✅ SUCCESS: Updated database permissions are clean!");
    } else {
      console.error("❌ FAILURE: Update permissions double-stringified!");
    }

    // 5. Test login return payload
    console.log("4. Testing auth service loginUser return payload...");
    const loginResult = await loginUser({
      email: testEmail,
      password: "password123"
    });

    console.log("-> Login user payload permissions:", loginResult.user.permissions);
    if (Array.isArray(loginResult.user.permissions) && loginResult.user.permissions.length === 2 && loginResult.user.permissions.includes("Payments")) {
      console.log("✅ SUCCESS: Login returns permissions as a clean JS array!");
    } else {
      console.error("❌ FAILURE: Login permissions payload is not an array or incorrect:", loginResult.user.permissions);
    }

  } catch (error) {
    console.error("❌ ERROR RUNNING TEST:", error);
  } finally {
    if (createdId) {
      console.log("5. Cleaning up test sub-admin...");
      await deleteSubAdminService(createdId);
      console.log("-> Cleaned up successfully!");
    }
  }

  console.log("=== RBAC INTEGRATION TEST COMPLETED ===");
  process.exit(0);
}

runTest();
