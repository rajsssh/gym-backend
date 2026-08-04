import { pool } from "../../config/db.js";

/**
 * Add a new lead
 */
export const addLeadService = async (data) => {
  const { adminId, branchId, fullName, email, phone, gender, source = "Walk-in", status = "New", notes, followUpDate, assignedToStaffId, leadType = 'GYM', interestedPlan } = data;

  if (!adminId || !fullName || !phone) {
    throw { status: 400, message: "adminId, fullName, and phone are required" };
  }

  const parsedAdminId = parseInt(adminId);
  const parsedBranchId = (branchId && branchId !== "undefined" && branchId !== "null" && branchId !== "") ? parseInt(branchId) : null;
  const parsedStaffId = (assignedToStaffId && assignedToStaffId !== "undefined" && assignedToStaffId !== "null" && assignedToStaffId !== "") ? parseInt(assignedToStaffId) : null;
  const parsedFollowUpDate = (followUpDate && followUpDate !== "undefined" && followUpDate !== "null" && followUpDate !== "") ? followUpDate : null;

  const [result] = await pool.query(
    `INSERT INTO leads (adminId, branchId, fullName, email, phone, gender, source, status, assignedToStaffId, notes, followUpDate, leadType, interestedPlan, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      parsedAdminId,
      parsedBranchId,
      fullName,
      email || null,
      phone,
      gender || null,
      source,
      status,
      parsedStaffId,
      notes || null,
      parsedFollowUpDate,
      leadType,
      interestedPlan || null
    ]
  );

  return {
    id: result.insertId,
    adminId: parsedAdminId,
    fullName,
    email,
    phone,
    gender,
    source,
    status,
    notes,
    leadType,
    interestedPlan,
  };
};

/**
 * Get all leads for a specific admin (gym owner)
 */
export const getAllLeadsService = async (adminId) => {
  const [rows] = await pool.query(
    `SELECT l.*, u.fullName AS assignedStaffName 
     FROM leads l 
     LEFT JOIN staff s ON l.assignedToStaffId = s.id 
     LEFT JOIN user u ON s.userId = u.id 
     WHERE l.adminId = ? 
     ORDER BY l.createdAt DESC`,
    [adminId]
  );
  return rows;
};

/**
 * Get all leads for superadmin (global CRM)
 */
export const getSuperAdminLeadsService = async () => {
  const [rows] = await pool.query(
    `SELECT * FROM leads 
     WHERE leadType = 'SAAS' OR adminId IS NULL
     ORDER BY createdAt DESC`
  );
  return rows;
};

/**
 * Get SAAS lead stats for superadmin CRM analytics
 */
export const getSuperAdminLeadStatsService = async () => {
  const [[total]] = await pool.query(
    `SELECT COUNT(*) as total, 
     SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted,
     SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as newLeads
     FROM leads WHERE leadType = 'SAAS'`
  );
  const rate = total.total > 0 ? ((total.converted / total.total) * 100).toFixed(1) : 0;
  return { total: total.total, converted: total.converted, newLeads: total.newLeads, conversionRate: rate };
};

/**
 * Public (no auth) — Save a SaaS lead from the landing page
 */
export const addSaasLeadService = async (data) => {
  const { fullName, email, phone, source = 'Landing Page', status = 'New', notes, interestedPlan } = data;
  const [result] = await pool.query(
    `INSERT INTO leads (adminId, fullName, email, phone, source, status, notes, leadType, interestedPlan, createdAt, updatedAt)
     VALUES (NULL, ?, ?, ?, ?, ?, ?, 'SAAS', ?, NOW(), NOW())`,
    [fullName, email || null, phone, source, status, notes || null, interestedPlan || null]
  );
  return { id: result.insertId, fullName, email, phone, source, status, leadType: 'SAAS' };
};

/**
 * Update a lead (status, notes, etc.)
 */
export const updateLeadService = async (id, data) => {
  const [[existing]] = await pool.query("SELECT * FROM leads WHERE id = ?", [id]);
  if (!existing) throw { status: 404, message: "Lead not found" };

  const { fullName, email, phone, gender, source, status, notes, followUpDate, assignedToStaffId, interestedPlan } = data;

  await pool.query(
    `UPDATE leads SET 
      fullName = COALESCE(?, fullName),
      email = COALESCE(?, email),
      phone = COALESCE(?, phone),
      gender = COALESCE(?, gender),
      source = COALESCE(?, source),
      status = COALESCE(?, status),
      notes = COALESCE(?, notes),
      followUpDate = COALESCE(?, followUpDate),
      assignedToStaffId = COALESCE(?, assignedToStaffId),
      interestedPlan = COALESCE(?, interestedPlan),
      updatedAt = NOW()
     WHERE id = ?`,
    [
      fullName || null,
      email || null,
      phone || null,
      gender || null,
      source || null,
      status || null,
      notes || null,
      followUpDate || null,
      assignedToStaffId || null,
      interestedPlan || null,
      id
    ]
  );

  const [[updatedLead]] = await pool.query("SELECT * FROM leads WHERE id = ?", [id]);
  return updatedLead;
};

/**
 * Delete a lead
 */
export const deleteLeadService = async (id) => {
  const [result] = await pool.query("DELETE FROM leads WHERE id = ?", [id]);
  if (result.affectedRows === 0) throw { status: 404, message: "Lead not found" };
  return true;
};

/**
 * Get leads assigned to a specific staff member (Sales Agent view)
 * Sales agents can see assigned leads + leads created under their admin
 */
export const getLeadsByStaffService = async (userId) => {
  const parsedUserId = parseInt(userId);
  if (!parsedUserId) {
    throw { status: 400, message: "userId is required" };
  }

  // Find staff record or user adminId
  const [[staffRecord]] = await pool.query(
    `SELECT s.id AS staffId, s.adminId FROM staff s WHERE s.userId = ?`,
    [parsedUserId]
  );

  const [[userRecord]] = await pool.query(
    `SELECT adminId FROM user WHERE id = ?`,
    [parsedUserId]
  );

  const staffId = staffRecord?.staffId || null;
  const adminId = staffRecord?.adminId || userRecord?.adminId || null;

  const [rows] = await pool.query(
    `SELECT l.*, u.fullName as assignedStaffName
     FROM leads l
     LEFT JOIN staff s ON l.assignedToStaffId = s.id
     LEFT JOIN user u ON s.userId = u.id
     WHERE l.assignedToStaffId = ? 
        OR s.userId = ? 
        OR l.assignedToStaffId = ?
        ${adminId ? `OR (l.adminId = ?)` : ""}
     ORDER BY l.createdAt DESC`,
    adminId ? [staffId || 0, parsedUserId, parsedUserId, adminId] : [staffId || 0, parsedUserId, parsedUserId]
  );
  return rows;
};

/**
 * Bulk allocate unassigned leads to a staff member (Admin feature)
 * Takes N unassigned leads and assigns them to one staff member
 */
export const bulkAllocateLeadsService = async ({ adminId, staffId, count }) => {
  const parsedAdminId = parseInt(adminId);
  const parsedStaffId = parseInt(staffId);
  const parsedCount = parseInt(count);

  if (!parsedAdminId || !parsedStaffId || !parsedCount) {
    throw { status: 400, message: "adminId, staffId, and count are required" };
  }
  if (parsedCount < 1 || parsedCount > 10000) {
    throw { status: 400, message: "count must be between 1 and 10000" };
  }

  // Fetch unassigned leads for this admin
  const [unassigned] = await pool.query(
    `SELECT id FROM leads 
     WHERE adminId = ? AND (assignedToStaffId IS NULL OR assignedToStaffId = 0)
     ORDER BY createdAt ASC
     LIMIT ?`,
    [parsedAdminId, parsedCount]
  );

  if (unassigned.length === 0) {
    throw { status: 404, message: "No unassigned leads available to allocate" };
  }

  const leadIds = unassigned.map(l => l.id);

  // Bulk update - assign all fetched leads to the staff member
  await pool.query(
    `UPDATE leads SET assignedToStaffId = ?, updatedAt = NOW() WHERE id IN (?)`,
    [parsedStaffId, leadIds]
  );

  return {
    allocatedCount: leadIds.length,
    staffId: parsedStaffId,
    leadIds,
  };
};

/**
 * Get summary of lead distribution across staff members (Admin dashboard view)
 */
export const getLeadDistributionService = async (adminId) => {
  const [rows] = await pool.query(
    `SELECT 
       s.id as staffId,
       u.fullName as staffName,
       COUNT(l.id) as totalAssigned,
       SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) as converted,
       SUM(CASE WHEN l.status = 'New' THEN 1 ELSE 0 END) as newLeads,
       SUM(CASE WHEN l.status = 'In Progress' THEN 1 ELSE 0 END) as inProgress
     FROM staff s
     JOIN user u ON s.userId = u.id
     LEFT JOIN leads l ON l.assignedToStaffId = s.id AND l.adminId = ?
     WHERE s.adminId = ?
     GROUP BY s.id, u.fullName
     ORDER BY totalAssigned DESC`,
    [adminId, adminId]
  );

  const [[unassignedRow]] = await pool.query(
    `SELECT COUNT(*) as unassignedCount FROM leads WHERE adminId = ? AND (assignedToStaffId IS NULL OR assignedToStaffId = 0)`,
    [adminId]
  );

  return {
    staffDistribution: rows,
    unassignedCount: unassignedRow.unassignedCount || 0,
  };
};
