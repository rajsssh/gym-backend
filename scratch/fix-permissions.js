import { pool } from "../src/config/db.js";

async function run() {
  try {
    const [subadmins] = await pool.query("SELECT id, permissions FROM user WHERE roleId = 9");
    console.log("Found subadmins in DB:", subadmins.length);
    
    for (const sub of subadmins) {
      const perms = sub.permissions;
      console.log(`Subadmin ID: ${sub.id}, Raw Permissions:`, perms);
      
      let parsed = perms;
      let parseCount = 0;
      // Loop to un-stringify if it's double-serialized
      while (typeof parsed === 'string' && parseCount < 5) {
        try {
          const next = JSON.parse(parsed);
          parsed = next;
          parseCount++;
        } catch (e) {
          break;
        }
      }
      
      if (Array.isArray(parsed)) {
        const cleanedPerms = JSON.stringify(parsed);
        console.log(`-> Cleaned to stringified array:`, cleanedPerms);
        await pool.query("UPDATE user SET permissions = ? WHERE id = ?", [cleanedPerms, sub.id]);
        console.log(`-> Updated subadmin ID ${sub.id} successfully!`);
      } else {
        console.log(`-> Could not parse to array. Saving empty array.`);
        await pool.query("UPDATE user SET permissions = ? WHERE id = ?", [JSON.stringify([]), sub.id]);
      }
    }
  } catch (error) {
    console.error("Error during migration script:", error);
  }
  process.exit(0);
}

run();
