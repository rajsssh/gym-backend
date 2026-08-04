import { pool } from "./src/config/db.js";

async function run() {
  try {
    const hash = "$2b$10$crhZxB76ZuAWo2BDk1i3AednUk5HK2zm4ApRzkyOvnsn90JPMUxPq"; // Hash of "123456"
    const emails = [
      "superadmin@gmail.com",
      "member@gmail.com",
      "salesagent@gmail.com",
      "generaltrainer1@gym.com"
    ];

    console.log("Resetting password hashes for dashboard users to '123456'...");
    
    for (const email of emails) {
      const [res] = await pool.query(
        "UPDATE user SET password = ? WHERE email = ?",
        [hash, email]
      );
      console.log(`Updated password for ${email}. Affected: ${res.affectedRows} rows.`);
    }

  } catch (error) {
    console.error("Error resetting passwords:", error);
  } finally {
    process.exit(0);
  }
}

run();
