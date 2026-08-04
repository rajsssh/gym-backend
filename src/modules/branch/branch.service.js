import { pool } from "../../config/db.js";

/**************************************
 * CREATE BRANCH
 **************************************/
export const createBranchService = async ({ name, address, phone, status, adminId, userId }) => {
  if (!name) throw { status: 400, message: "Branch name is required" };
  
  const finalAdminId = adminId || userId || null;

  // Check unique branch name
  const [exists] = await pool.query(
    "SELECT id FROM branch WHERE name = ?",
    [name]
  );
  if (exists.length > 0) throw { status: 400, message: "Branch name already exists" };

  // Insert branch
  const [result] = await pool.query(
    `INSERT INTO branch (name, address, phone, status, adminId)
     VALUES (?, ?, ?, ?, ?)`,
    [name, address || null, phone || null, status === "INACTIVE" ? "INACTIVE" : "ACTIVE", finalAdminId]
  );

  // Return created branch
  return { id: result.insertId, name, address, phone, status, adminId: finalAdminId };
};

/**************************************
 * LIST ALL BRANCHES
 **************************************/
export const listBranchesService = async () => {
  const [rows] = await pool.query(
    `SELECT b.*, u.fullName AS adminName 
     FROM branch b 
     LEFT JOIN user u ON b.adminId = u.id 
     ORDER BY b.id DESC`
  );
  return rows;
};

/**************************************
 * GET BRANCH BY ID
 **************************************/
export const getBranchByIdService = async (id) => {
  const branchId = Number(id);
  if (!branchId) throw { status: 400, message: "Invalid branch id" };

  const [rows] = await pool.query(
    "SELECT * FROM branch WHERE id = ?",
    [branchId]
  );
  if (rows.length === 0) throw { status: 404, message: "Branch not found" };

  return rows[0];
};

/**************************************
 * GET BRANCH BY ADMIN ID
 **************************************/
export const getBranchByAdminIdService = async (adminId) => {
  const [rows] = await pool.query(
    "SELECT * FROM branch WHERE adminId = ?",
    [Number(adminId)]
  );
  return rows;
};

/**************************************
 * UPDATE BRANCH
 **************************************/
// export const updateBranchService = async (id, data) => {
//   const branchId = Number(id);
//   if (!branchId) throw { status: 400, message: "Invalid branch id" };

//   // Check exists
//   const [existingRows] = await pool.query(
//     "SELECT * FROM branch WHERE id = ?",
//     [branchId]
//   );
//   if (existingRows.length === 0) throw { status: 404, message: "Branch not found" };
//   const existing = existingRows[0];

//   // Check duplicate name
//   if (data.name) {
//     const [dup] = await pool.query(
//       "SELECT id FROM branch WHERE name = ? AND id != ?",
//       [data.name, branchId]
//     );
//     if (dup.length > 0) throw { status: 400, message: "Branch name already exists" };
//   }

//   // // Check adminId valid
//   // if (data.adminId) {
//   //   const [adminExists] = await pool.query(
//   //     "SELECT id FROM user WHERE id = ? AND roleId = 2",
//   //     [data.adminId]
//   //   );
//   //   if (adminExists.length === 0) throw { status: 404, message: "Admin not found" };
//   // }

//   // Update
//   const [result] = await pool.query(
//     `UPDATE branch SET 
//        name = ?, 
//        address = ?, 
//        phone = ?, 
//        status = ?, 
//        adminId = ? 
//      WHERE id = ?`,
//     [
//       data.name || existing.name,
//       data.address || existing.address,
//       data.phone || existing.phone,
//       data.status === "ACTIVE" || data.status === "INACTIVE" ? data.status : existing.status,
//       data.adminId || existing.adminId,
//       branchId
//     ]
//   );

//   return getBranchByIdService(branchId);
// };

export const updateBranchService = async (id, data) => {
  const branchId = Number(id);
  if (!branchId) {
    throw { status: 400, message: "Invalid branch id" };
  }

  // 1️⃣ Check branch exists
  const [existingRows] = await pool.query(
    "SELECT * FROM branch WHERE id = ?",
    [branchId]
  );

  if (existingRows.length === 0) {
    throw { status: 404, message: "Branch not found" };
  }

  const existing = existingRows[0];

  // 2️⃣ Check duplicate branch name
  if (data.name) {
    const [dup] = await pool.query(
      "SELECT id FROM branch WHERE name = ? AND id != ?",
      [data.name, branchId]
    );

    if (dup.length > 0) {
      throw { status: 400, message: "Branch name already exists" };
    }
  }

  // 3️⃣ Validate status
  const status =
    data.status === "ACTIVE" || data.status === "INACTIVE"
      ? data.status
      : existing.status;

  // 4️⃣ Update branch (adminId removed)
  await pool.query(
    `UPDATE branch 
     SET name = ?, 
         address = ?, 
         phone = ?, 
         status = ?
     WHERE id = ?`,
    [
      data.name ?? existing.name,
      data.address ?? existing.address,
      data.phone ?? existing.phone,
      status,
      branchId
    ]
  );

  // 5️⃣ Return updated branch
  return getBranchByIdService(branchId);
};
/**************************************
 * DELETE BRANCH
 **************************************/
// export const deleteBranchService = async (id) => {
//   const branchId = Number(id);
//   if (!branchId) throw { status: 400, message: "Invalid branch id" };


//   // Check exists
//     await pool.query("DELETE FROM alert WHERE branchId = ?", [id]);
//   const [existing] = await pool.query("SELECT id FROM branch WHERE id = ?", [branchId]);
//   if (existing.length === 0) throw { status: 404, message: "Branch not found" };

//   await pool.query("DELETE FROM branch WHERE id = ?", [branchId]);
//   return { message: "Branch deleted successfully" };
// };


// export const deleteBranchService = async (id) => {
//   const branchId = Number(id);
//   if (!branchId) throw { status: 400, message: "Invalid branch id" };

//   // 1. Check branch exists
//   const [existing] = await pool.query(
//     "SELECT id FROM branch WHERE id = ?",
//     [branchId]
//   );
//   if (existing.length === 0) {
//     throw { status: 404, message: "Branch not found" };
//   }

//   // 2. Find all tables referencing branch.id
//   const [fkTables] = await pool.query(`
//     SELECT TABLE_NAME, COLUMN_NAME
//     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
//     WHERE REFERENCED_TABLE_NAME = 'branch'
//       AND REFERENCED_COLUMN_NAME = 'id'
//       AND TABLE_SCHEMA = DATABASE();
//   `);

//   // 3. Delete from all dependent tables
//   for (const fk of fkTables) {
//     const table = fk.TABLE_NAME;
//     const column = fk.COLUMN_NAME;

//     await pool.query(
//       `DELETE FROM ${table} WHERE ${column} = ?`,
//       [branchId]
//     );
//   }
//   await pool.query("DELETE FROM memberplan WHERE branchId = ?", [branchId]);

//   // 4. Delete the branch
//   await pool.query("DELETE FROM branch WHERE id = ?", [branchId]);

//   return { message: "Branch deleted successfully" };
// };
export const deleteBranchService = async (id) => {
  const branchId = Number(id);
  if (!branchId) throw { status: 400, message: "Invalid branch id" };

  // 1️⃣ Check if branch exists
  const [existing] = await pool.query(
    "SELECT id FROM branch WHERE id = ?",
    [branchId]
  );
  if (existing.length === 0) {
    throw { status: 404, message: "Branch not found" };
  }

  // 2️⃣ Get FK-based tables referencing branch.id
  const [fkTables] = await pool.query(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE REFERENCED_TABLE_NAME = 'branch'
      AND REFERENCED_COLUMN_NAME = 'id'
      AND TABLE_SCHEMA = DATABASE();
  `);

  // 3️⃣ Delete from all FK-referencing tables
  for (const fk of fkTables) {
    await pool.query(
      `DELETE FROM \`${fk.TABLE_NAME}\` WHERE \`${fk.COLUMN_NAME}\` = ?`,
      [branchId]
    );
  }

  // 4️⃣ Delete from NON-FK tables with branchId column
  const nonFKTables = [
    "memberplan",
    "booking_requests",
    "dietplan",
    "group_class_bookings",
    "pt_bookings",
    "shifts",
    "tasks",
    "unified_bookings",
    "workoutplan"
  ];

  for (const table of nonFKTables) {
    await pool.query(
      `DELETE FROM \`${table}\` WHERE branchId = ?`,
      [branchId]
    );
  }

  // 5️⃣ Delete branch
  await pool.query("DELETE FROM branch WHERE id = ?", [branchId]);

  return { message: "Branch deleted successfully" };
};
