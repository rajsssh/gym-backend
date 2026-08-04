import { pool } from "../src/config/db.js";

async function insertDummyLeads() {
  try {
    const adminId = 90;
    const branchId = 48;
    const count = 50;
    const leadsToInsert = [];

    console.log("Generating 50 dummy leads...");
    for (let i = 1; i <= count; i++) {
      const fullName = `Dummy Lead ${i}`;
      const email = `dummy.lead${i}@example.com`;
      // Generate a 10-digit dummy phone number starting with 9000000
      const phone = `9000000${String(i).padStart(3, '0')}`;
      const gender = i % 2 === 0 ? 'Female' : 'Male';
      const source = 'Landing Page';
      const status = 'New';
      const notes = `Dummy lead #${i} generated for bulk allocation testing.`;
      const now = new Date();

      leadsToInsert.push([
        adminId,
        branchId,
        fullName,
        email,
        phone,
        gender,
        source,
        status,
        null, // assignedToStaffId is null (unassigned)
        notes,
        now, // createdAt
        now  // updatedAt
      ]);
    }

    console.log("Inserting leads into database...");
    const query = `
      INSERT INTO leads (adminId, branchId, fullName, email, phone, gender, source, status, assignedToStaffId, notes, createdAt, updatedAt)
      VALUES ?
    `;

    // Using query with a nested array for bulk insertion: [[val1, val2, ...], [val1, val2, ...]]
    const [result] = await pool.query(query, [leadsToInsert]);
    
    console.log(`Success! Inserted ${result.affectedRows} dummy leads.`);
    
    const [[newCount]] = await pool.query("SELECT COUNT(*) as count FROM leads WHERE adminId = ?", [adminId]);
    console.log(`Total leads for admin ${adminId} now: ${newCount.count}`);
    
    const [[unassignedCount]] = await pool.query(
      "SELECT COUNT(*) as count FROM leads WHERE adminId = ? AND (assignedToStaffId IS NULL OR assignedToStaffId = 0)",
      [adminId]
    );
    console.log(`Unassigned leads: ${unassignedCount.count}`);
  } catch (err) {
    console.error("Error inserting dummy leads:", err);
  } finally {
    process.exit(0);
  }
}

insertDummyLeads();
