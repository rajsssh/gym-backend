import { pool } from "../../config/db.js";

export const saveMemberPlan = async (payload) => {
  // allow both: name OR planName, validityDays OR validity
  const name = payload.name || payload.planName;
  const sessions = Number(payload.sessions ?? 0);
  const validityDays = Number(payload.validityDays ?? payload.validity ?? 0);
  const price = Number(payload.price ?? 0);
  const type = payload.type || null;
  const adminId = payload.adminId;
  const branchId = payload.branchId ?? null;

  // Check if 'MEMBER' type requires trainer fields
  const trainerId = type === "MEMBER" ? payload.trainerId ?? null : null;
  const trainerType = type === "MEMBER" ? payload.trainerType ?? null : null;
  const status = "Active";
  // Validation
  if (!adminId) throw { status: 400, message: "adminId is required" };
  if (!name) throw { status: 400, message: "Plan name is required" };

  // Insert into the memberplan table with optional trainerId and trainerType
  const [result] = await pool.query(
    `INSERT INTO memberplan 
      (name, sessions, validityDays, price, type, adminId, branchId, trainerId, trainerType, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      sessions,
      validityDays,
      price,
      type,
      adminId,
      branchId,
      trainerId,
      trainerType,
      status,
    ]
  );

  // Fetch the newly inserted record
  const [rows] = await pool.query(`SELECT * FROM memberplan WHERE id = ?`, [
    result.insertId,
  ]);

  return rows[0];
};

export const getAllMemberPlans = async (adminId) => {
  const [plans] = await pool.query(
    `SELECT * FROM memberplan WHERE adminId = ? ORDER BY id DESC`,
    [Number(adminId)]
  );
  return plans;
};

export const getMemberPlansByAdminIdService = async (adminId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      id,
      name,
      sessions,
      validityDays,
      price,
      type,
      trainerId,
      trainerType,
      status,
      adminId,
      branchId,
      createdAt,
      updatedAt

    FROM memberplan
    WHERE adminId = ?
    ORDER BY id DESC
    `,
    [Number(adminId)]
  );

  return rows;
};

export const getMemberPlanById = async (id) => {
  const [plans] = await pool.query(`SELECT * FROM memberplan WHERE id = ?`, [
    Number(id),
  ]);
  if (!plans[0]) throw { status: 404, message: "Member plan not found" };
  return plans[0];
};

// // DELETE
export const deleteMemberPlan = async (id) => {
  const [result] = await pool.query(`DELETE FROM memberplan WHERE id = ?`, [
    Number(id),
  ]);

  if (result.affectedRows === 0) {
    throw { status: 404, message: "Plan not found" };
  }

  return true;
};

export const updateMemberPlan = async (planId, payload, adminId) => {
  /* ------------------------------------
     1️⃣ Check plan exists & permission
  ------------------------------------ */
  const [existingRows] = await pool.query(
    `SELECT * FROM memberplan WHERE id = ? AND adminId = ?`,
    [planId, adminId]
  );

  if (!existingRows.length) {
    throw { status: 404, message: "Plan not found or permission denied" };
  }

  /* ------------------------------------
     2️⃣ Field mapping (payload → DB)
  ------------------------------------ */
  const fieldMap = {
    planName: "name",
    sessions: "sessions",
    validity: "validityDays",
    price: "price",
    branchId: "branchId",
    trainerId: "trainerId",
    trainerType: "trainerType",
    status: "status",
  };

  const updateFields = [];
  const updateValues = [];

  /* ------------------------------------
     3️⃣ Build dynamic update query
  ------------------------------------ */
  for (const key in fieldMap) {
    if (payload[key] !== undefined) {
      updateFields.push(`${fieldMap[key]} = ?`);
      updateValues.push(payload[key]);
    }
  }

  // ❌ Nothing to update
  if (updateFields.length === 0) {
    throw { status: 400, message: "No valid fields provided for update" };
  }

  /* ------------------------------------
     4️⃣ Always update timestamp
  ------------------------------------ */
  updateFields.push("updatedAt = NOW(3)");

  const sql = `
    UPDATE memberplan
    SET ${updateFields.join(", ")}
    WHERE id = ? AND adminId = ?
  `;

  updateValues.push(planId, adminId);

  await pool.query(sql, updateValues);

  /* ------------------------------------
     5️⃣ Return updated plan
  ------------------------------------ */
  const [rows] = await pool.query(
    `SELECT * FROM memberplan WHERE id = ? AND adminId = ?`,
    [planId, adminId]
  );

  return rows[0];
};

export const getAllMemberPlansService = async () => {
  const [rows] = await pool.query(
    `SELECT 
        id,
        name,
        sessions,
        validityDays,
        price,
        type,
        adminId,
        branchId,
        createdAt,
        updatedAt
     FROM memberplan
     ORDER BY createdAt DESC`
  );

  return rows;
};
  