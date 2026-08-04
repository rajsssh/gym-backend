import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";

const processPermissions = (permissions) => {
  if (!permissions) return JSON.stringify([]);
  if (typeof permissions === "string") {
    try {
      const parsed = JSON.parse(permissions);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      }
    } catch (e) {}
    return JSON.stringify([permissions]);
  }
  if (Array.isArray(permissions)) {
    return JSON.stringify(permissions);
  }
  return JSON.stringify([]);
};

// Create Subadmin
export const createSubAdminService = async (data) => {
  const { fullName, email, phone, password, permissions, profileImage } = data;

  if (!fullName || !email || !password) {
    throw { status: 400, message: "All fields except phone are required" };
  }

  // Check if email already exists
  const [existing] = await pool.query("SELECT id FROM user WHERE email = ?", [email]);
  if (existing.length > 0) {
    throw { status: 400, message: "Email already registered" };
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const perms = processPermissions(permissions);

  // Insert into user with roleId = 9 (Subadmin)
  const [result] = await pool.query(
    "INSERT INTO user (fullName, email, phone, password, visiblePassword, roleId, permissions, profileImage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [fullName, email, phone || null, hashedPassword, password, 9, perms, profileImage || null]
  );

  return { id: result.insertId, fullName, email, phone, profileImage, permissions: perms, visiblePassword: password };
};

// Get all Subadmins
export const getAllSubAdminsService = async () => {
  const [rows] = await pool.query(
    "SELECT id, fullName, email, phone, profileImage, permissions, visiblePassword, createdAt FROM user WHERE roleId = 9 ORDER BY id DESC"
  );
  return rows;
};

// Update Subadmin
export const updateSubAdminService = async (id, data) => {
  const { fullName, phone, permissions, password, profileImage } = data;

  const updates = [];
  const values = [];

  if (fullName) {
    updates.push("fullName = ?");
    values.push(fullName);
  }

  if (phone !== undefined) {
    updates.push("phone = ?");
    values.push(phone);
  }

  if (permissions !== undefined) {
    updates.push("permissions = ?");
    values.push(processPermissions(permissions));
  }

  if (profileImage !== undefined) {
    updates.push("profileImage = ?");
    values.push(profileImage);
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    updates.push("password = ?");
    values.push(hashedPassword);
    
    updates.push("visiblePassword = ?");
    values.push(password);
  }

  if (updates.length === 0) return { message: "Nothing to update" };

  values.push(id);

  await pool.query(`UPDATE user SET ${updates.join(", ")} WHERE id = ? AND roleId = 9`, values);

  const [updated] = await pool.query("SELECT id, fullName, email, phone, profileImage, permissions, visiblePassword FROM user WHERE id = ?", [id]);
  return updated[0];
};

// Delete Subadmin
export const deleteSubAdminService = async (id) => {
  await pool.query("DELETE FROM user WHERE id = ? AND roleId = 9", [id]);
  return { message: "Subadmin deleted successfully" };
};
