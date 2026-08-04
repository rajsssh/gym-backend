import { uploadToCloudinary } from "../../config/cloudinary.js";
import { pool } from "../../config/db.js";
const validateAdminId = async (adminId) => {
  if (!adminId) return null;

  const [rows] = await pool.query(
    `SELECT id FROM user WHERE id = ?`,
    [adminId]
  );
  console.log(rows);

  return rows.length ? adminId : null;
};
const validateMemberPlanId = async (memberPlanId) => {
  if (!memberPlanId) return null;

  const [rows] = await pool.query(
    `SELECT id FROM memberplan WHERE id = ?`,
    [memberPlanId]
  );

  return rows.length ? memberPlanId : null;
};

// export const createAppSettingsService = async (adminId, data, file) => {
//   let logoUrl = null;

//   if (file) {
//     logoUrl = await uploadToCloudinary(file, "gym/app-logo");
//     if (!logoUrl) throw { status: 500, message: "Logo upload failed" };
//   }

//   const [result] = await pool.query(
//     `INSERT INTO app_settings 
//      (logo, description, url, memberPlanId, adminId)
//      VALUES (?, ?, ?, ?, ?)`,
//     [
//       logoUrl ?? null,
//       data.description ?? null,
//       data.url ?? null,
//       data.memberPlanId ?? null,
//       adminId ?? null
//     ]
//   );

//   const [rows] = await pool.query(
//     `SELECT * FROM app_settings WHERE id = ?`,
//     [result.insertId]
//   );

//   return rows[0];
// };

// /* UPDATE */
// export const updateAppSettingsService = async (id, adminId, data, file) => {
//   const settingsId = Number(id);
//   if (!settingsId) throw { status: 400, message: "Invalid id" };

//   const [rows] = await pool.query(
//     `SELECT * FROM app_settings WHERE id = ?`,
//     [settingsId]
//   );
//   if (rows.length === 0) throw { status: 404, message: "Settings not found" };

//   const existing = rows[0];
//   let logoUrl = existing.logo;

//   if (file) {
//     logoUrl = await uploadToCloudinary(file, "gym/app-logo");
//     if (!logoUrl) throw { status: 500, message: "Logo upload failed" };
//   }

//   await pool.query(
//     `UPDATE app_settings
//      SET 
//        logo = ?,
//        description = ?,
//        url = ?,
//        memberPlanId = ?,
//        adminId = ?
//      WHERE id = ?`,
//     [
//       logoUrl ?? null,
//       data.description ?? existing.description ?? null,
//       data.url ?? existing.url ?? null,
//       data.memberPlanId ?? existing.memberPlanId ?? null,
//       adminId ?? existing.adminId ?? null,
//       settingsId
//     ]
//   );

//   const [updated] = await pool.query(
//     `SELECT * FROM app_settings WHERE id = ?`,
//     [settingsId]
//   );

//   return updated[0];
// };

// export const createAppSettingsService = async (adminId, data, file) => {
//   let logoUrl = null;

//   if (file) {
//     logoUrl = await uploadToCloudinary(file, "gym/app-logo");
//     if (!logoUrl) throw { status: 500, message: "Logo upload failed" };
//   }

//   const validAdminId = await validateAdminId(adminId);
//   const validMemberPlanId = await validateMemberPlanId(data.memberPlanId);

//   const [result] = await pool.query(
//     `INSERT INTO app_settings 
//      (logo, description, url, memberPlanId, adminId)
//      VALUES (?, ?, ?, ?, ?)`,
//     [
//       logoUrl ?? null,
//       data.description ?? null,
//       data.url ?? null,
//       validMemberPlanId,
//       validAdminId
//     ]
//   );

//   const [rows] = await pool.query(
//     `SELECT * FROM app_settings WHERE id = ?`,
//     [result.insertId]
//   );

//   return rows[0];
// };

export const createAppSettingsService = async (adminId, data, file) => {
  let logoUrl = null;

  /* UPLOAD LOGO */
  if (file) {
    logoUrl = await uploadToCloudinary(file, "gym/app-logo");
    if (!logoUrl) throw { status: 500, message: "Logo upload failed" };
  }

  /* VALIDATE ADMIN ID (USER TABLE) */
  const validAdminId = await validateAdminId(adminId);

  /* 🚫 ONE-SETTINGS-PER-ADMIN RULE */
  if (validAdminId) {
    const [existing] = await pool.query(
      `SELECT id FROM app_settings WHERE adminId = ? LIMIT 1`,
      [validAdminId]
    );

    if (existing.length > 0) {
      throw {
        status: 409,
        message: "This admin already exists",
      };
    }
  }

  /* VALIDATE MEMBER PLAN */
  const validMemberPlanId = await validateMemberPlanId(data.memberPlanId);

  /* CREATE SETTINGS */
  const [result] = await pool.query(
    `INSERT INTO app_settings 
     (logo, gym_name,description, url, memberPlanId, adminId)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      logoUrl ?? null,
      data.gym_name ?? null,
      data.description ?? null,
      data.url ?? null,
      validMemberPlanId,
      validAdminId
    ]
  );

  const [rows] = await pool.query(
    `SELECT * FROM app_settings WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
};
/* =================================================
   UPDATE
================================================= */
export const updateAppSettingsService = async (id, adminId, data, file) => {
  const settingsId = Number(id);
  if (!settingsId) throw { status: 400, message: "Invalid id" };

  const [rows] = await pool.query(
    `SELECT * FROM app_settings WHERE id = ?`,
    [settingsId]
  );
  if (rows.length === 0) throw { status: 404, message: "Settings not found" };

  const existing = rows[0];
  let logoUrl = existing.logo;

  /* LOGO */
  if (file) {
    const uploaded = await uploadToCloudinary(file, "gym/app-logo");
    if (!uploaded) throw { status: 500, message: "Logo upload failed" };
    logoUrl = uploaded;
  }

  /* ADMIN ID (only update if explicitly sent) */
  let finalAdminId = existing.adminId;
  if (adminId !== undefined && adminId !== null && adminId !== "") {
    finalAdminId = await validateAdminId(adminId);
  }

  /* MEMBER PLAN ID (only update if explicitly sent) */
  let finalMemberPlanId = existing.memberPlanId;
  if (
    data.memberPlanId !== undefined &&
    data.memberPlanId !== null &&
    data.memberPlanId !== ""
  ) {
    finalMemberPlanId = await validateMemberPlanId(data.memberPlanId);
  }
const finalGymName =
  data.gym_name !== undefined && data.gym_name !== ""
    ? data.gym_name
    : existing.gym_name;
  /* TEXT FIELDS */
  const finalDescription =
    data.description !== undefined && data.description !== ""
      ? data.description
      : existing.description;

  const finalUrl =
    data.url !== undefined && data.url !== ""
      ? data.url
      : existing.url;

  await pool.query(
    `UPDATE app_settings
     SET 
       logo = ?,
       gym_name = ?,
       description = ?,
       url = ?,
       memberPlanId = ?,
       adminId = ?
     WHERE id = ?`,
    [
      logoUrl,
      finalGymName,
      finalDescription,
      finalUrl,
      finalMemberPlanId,
      finalAdminId,
      settingsId
    ]
  );

  const [updated] = await pool.query(
    `SELECT * FROM app_settings WHERE id = ?`,
    [settingsId]
  );

  return updated[0];
};
/* DELETE */
export const deleteAppSettingsService = async (id) => {
  const settingsId = Number(id);
  if (!settingsId) throw { status: 400, message: "Invalid id" };

  const [rows] = await pool.query(
    `SELECT id FROM app_settings WHERE id = ?`,
    [settingsId]
  );
  if (rows.length === 0) throw { status: 404, message: "Settings not found" };

  await pool.query(
    `DELETE FROM app_settings WHERE id = ?`,
    [settingsId]
  );

  return true;
};

/* GET BY ID */
export const getAppSettingsByIdService = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM app_settings WHERE id = ?`,
    [id]
  );
  if (rows.length === 0) throw { status: 404, message: "Settings not found" };
  return rows[0];
};

/* GET ALL */
export const getAllAppSettingsService = async () => {
  const [rows] = await pool.query(
    `SELECT * FROM app_settings ORDER BY createdAt DESC`
  );
  return rows;
};

export const getAppSettingsByAdminIdService = async (adminId) => {
  const validAdminId = await validateAdminId(adminId);

  if (!validAdminId) {
    throw { status: 400, message: "Invalid adminId" };
  }

  const [rows] = await pool.query(
    `SELECT * FROM app_settings WHERE adminId = ? LIMIT 1`,
    [validAdminId]
  );

  if (rows.length === 0) {
    return {}; // Return empty object instead of throwing 404 so frontend doesn't show errors for new admins
  }

  const appSettings = rows[0];

  // Fetch UPI settings
  const [upiRows] = await pool.query(
    `SELECT upiQrCode, upiId, upiAccountHolder, paymentInstructions FROM tenantintegrationsettings WHERE tenantId = ? LIMIT 1`,
    [validAdminId]
  );

  if (upiRows.length > 0) {
    Object.assign(appSettings, upiRows[0]);
  }

  return appSettings;
};