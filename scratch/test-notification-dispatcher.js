import { pool } from "../src/config/db.js";
import { getGlobalNotificationChannels, dispatchNotification } from "../src/utils/notificationDispatcher.js";

async function main() {
  try {
    console.log("🧪 Starting integration test for Notification Dispatcher...");

    // Test 1: Fetch default settings
    console.log("\n1. Testing getGlobalNotificationChannels for 'welcome_note'...");
    const welcomeChannels = await getGlobalNotificationChannels("welcome_note");
    console.log("Channels returned:", welcomeChannels);
    if (!Array.isArray(welcomeChannels)) throw new Error("Should return an array");
    console.log("✅ Default channels fetch passed.");

    // Test 2: Dispatch mock Welcome Note notification
    console.log("\n2. Testing dispatchNotification with category='welcome_note'...");
    const dispatchRes = await dispatchNotification({
      category: "welcome_note",
      toEmail: "test-recipient@example.com",
      toPhone: "919876543210",
      toUserId: 9999,
      memberId: null,
      subject: "Welcome Guest!",
      message: "This is a mock welcome note text message."
    });
    console.log("Dispatch Result:", JSON.stringify(dispatchRes, null, 2));
    
    // Check if logged in notificationlog
    const [logs] = await pool.query(
      "SELECT * FROM notificationlog ORDER BY id DESC LIMIT 5"
    );
    console.log("Recent DB logs:", logs);
    
    console.log("\n🎉 Integration tests finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Integration test failed:", err);
    process.exit(1);
  }
}

main();
