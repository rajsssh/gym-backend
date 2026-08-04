import { pool } from "../src/config/db.js";

async function run() {
  try {
    console.log("Starting database cleanup...");

    // 1. Find all members except 'vaani' and 'abc'
    const [membersToKeep] = await pool.query(
      "SELECT id, fullName FROM member WHERE fullName IN ('vaani', 'abc')"
    );
    console.log("Keeping members:", membersToKeep);

    const [allMembers] = await pool.query("SELECT id, fullName FROM member");
    const keepIds = membersToKeep.map(m => m.id);
    const deleteIds = allMembers.filter(m => !keepIds.includes(m.id)).map(m => m.id);

    console.log("Deleting members with IDs:", deleteIds);

    if (deleteIds.length > 0) {
      // Delete from dependent tables
      const dependentTables = [
        "booking",
        "dietplanassignment",
        "member_plan_assignment",
        "membership_renewal_requests",
        "payment",
        "workoutplanassignment",
        "member_health_log",
        "used_qr_nonces",
        "alert",
        "notificationlog",
        "memberattendance",
        "booking_requests",
        "unified_bookings",
        "pt_bookings",
        "group_class_bookings"
      ];

      for (const table of dependentTables) {
        try {
          const [res] = await pool.query(
            `DELETE FROM ${table} WHERE memberId IN (?)`,
            [deleteIds]
          );
          console.log(`Deleted from ${table}: ${res.affectedRows} rows`);
        } catch (e) {
          console.log(`Table ${table} did not have rows to delete or error: ${e.message}`);
        }
      }

      // Finally, delete the members
      const [res] = await pool.query(
        "DELETE FROM member WHERE id IN (?)",
        [deleteIds]
      );
      console.log(`Deleted from member: ${res.affectedRows} rows`);
    } else {
      console.log("No members to delete.");
    }

    // 2. Leads table cleanup - Keep only 'vaani' and 'abc'
    const [leadsToKeep] = await pool.query(
      "SELECT id, fullName FROM leads WHERE fullName IN ('vaani', 'abc')"
    );
    console.log("Keeping leads:", leadsToKeep);

    const [allLeads] = await pool.query("SELECT id, fullName FROM leads");
    const keepLeadIds = leadsToKeep.map(l => l.id);
    const deleteLeadIds = allLeads.filter(l => !keepLeadIds.includes(l.id)).map(l => l.id);

    console.log("Deleting leads with IDs:", deleteLeadIds);

    if (deleteLeadIds.length > 0) {
      const [res] = await pool.query(
        "DELETE FROM leads WHERE id IN (?)",
        [deleteLeadIds]
      );
      console.log(`Deleted from leads: ${res.affectedRows} rows`);
    } else {
      console.log("No leads to delete.");
    }

    console.log("Database cleanup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
}

run();
