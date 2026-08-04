import { pool } from "../../config/db.js";
import { createAppNotification } from "../appNotifications/appNotification.service.js";
import { sendTemplatedNotification } from "../messageTemplates/messageTemplate.service.js";

/**
 * Assign multiple plans to a member
 * @param {Object} data - { memberId, plans: [{planId, membershipFrom, paymentMode, amountPaid}], assignedBy }
 */
export const assignPlansToMember = async (data) => {
  const { memberId, plans, assignedBy } = data;

  if (!memberId || !plans || !Array.isArray(plans) || plans.length === 0) {
    throw { status: 400, message: "memberId and plans array are required" };
  }

  // Verify member exists
  const [[member]] = await pool.query("SELECT id, userId, adminId, branchId FROM member WHERE id = ?", [memberId]);
  if (!member) {
    throw { status: 404, message: "Member not found" };
  }

  const assignments = [];

  for (const planData of plans) {
    const { planId, membershipFrom, paymentMode, amountPaid } = planData;

    // Fetch plan details
    const [[plan]] = await pool.query(
      "SELECT id, name, validityDays, price FROM memberplan WHERE id = ?",
      [planId]
    );

    if (!plan) {
      throw { status: 404, message: `Plan with ID ${planId} not found` };
    }

    // Calculate membership dates
    const startDate = membershipFrom ? new Date(membershipFrom) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Number(plan.validityDays || 30));

    // Insert plan assignment
    const [result] = await pool.query(
      `INSERT INTO member_plan_assignment 
        (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, NOW())`,
      [
        memberId,
        planId,
        startDate,
        endDate,
        paymentMode || null,
        amountPaid ? Number(amountPaid) : plan.price,
        assignedBy || member.adminId,
      ]
    );

    assignments.push({
      id: result.insertId,
      memberId,
      planId,
      membershipFrom: startDate,
      membershipTo: endDate,
      paymentMode: paymentMode || null,
      amountPaid: amountPaid ? Number(amountPaid) : plan.price,
    });

    // APP NOTIFICATION
    if (member.userId) {
      await createAppNotification({
        tenantId: member.adminId || member.userId,
        receiverId: member.userId,
        receiverRole: 'Member',
        type: 'General',
        title: 'Membership Activated',
        message: `Your membership plan '${plan.name || 'N/A'}' has been successfully assigned. Price: ₹${plan.price || 0}, Validity: ${plan.validityDays || 30} days.`,
        referenceType: 'PLAN_ASSIGNMENT',
        referenceId: result.insertId.toString(),
        actionUrl: '/member-dashboard'
      }).catch(err => console.error("Error creating APP NOTIFICATION:", err.message));
    }
  }

  return {
    message: "Plans assigned successfully",
    assignments,
  };
};

/**
 * Get all plan assignments for a member
 */
export const getMemberPlanAssignments = async (memberId) => {
  const [assignments] = await pool.query(
    `SELECT 
      mpa.id,
      mpa.memberId,
      mpa.planId,
      mpa.membershipFrom,
      mpa.membershipTo,
      mpa.paymentMode,
      mpa.amountPaid,
      mpa.status,
      mpa.assignedAt,
      mp.name AS planName,
      mp.sessions,
      mp.validityDays,
      mp.price,
      mp.type AS planType,
      mp.trainerType,
      u.fullName AS assignedByName,
      DATEDIFF(mpa.membershipTo, CURDATE()) AS remainingDays,
      CASE
        WHEN mpa.membershipTo < CURDATE() THEN 'Expired'
        WHEN mpa.membershipTo >= CURDATE() THEN 'Active'
        ELSE mpa.status
      END AS computedStatus
    FROM member_plan_assignment mpa
    JOIN memberplan mp ON mpa.planId = mp.id
    LEFT JOIN user u ON mpa.assignedBy = u.id
    WHERE mpa.memberId = ?
    ORDER BY mpa.membershipFrom DESC`,
    [memberId]
  );

  return assignments;
};

/**
 * Get active plan assignments for a member
 */
export const getActiveMemberPlans = async (memberId) => {
  const [assignments] = await pool.query(
    `SELECT 
      mpa.id,
      mpa.memberId,
      mpa.planId,
      mpa.membershipFrom,
      mpa.membershipTo,
      mpa.paymentMode,
      mpa.amountPaid,
      mpa.status,
      mp.name AS planName,
      mp.sessions,
      mp.validityDays,
      mp.price,
      mp.type AS planType,
      mp.trainerType,
      DATEDIFF(mpa.membershipTo, CURDATE()) AS remainingDays
    FROM member_plan_assignment mpa
    JOIN memberplan mp ON mpa.planId = mp.id
    WHERE mpa.memberId = ?
      AND mpa.status = 'Active'
      AND mpa.membershipTo >= CURDATE()
    ORDER BY mpa.membershipFrom DESC`,
    [memberId]
  );

  return assignments;
};

/**
 * Update a plan assignment
 */
export const updatePlanAssignment = async (assignmentId, data) => {
  const { status, membershipFrom, membershipTo, paymentMode, amountPaid } = data;

  const [[existing]] = await pool.query(
    "SELECT * FROM member_plan_assignment WHERE id = ?",
    [assignmentId]
  );

  if (!existing) {
    throw { status: 404, message: "Plan assignment not found" };
  }

  const updates = [];
  const values = [];

  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }
  if (membershipFrom !== undefined) {
    updates.push("membershipFrom = ?");
    values.push(new Date(membershipFrom));
  }
  if (membershipTo !== undefined) {
    updates.push("membershipTo = ?");
    values.push(new Date(membershipTo));
  }
  if (paymentMode !== undefined) {
    updates.push("paymentMode = ?");
    values.push(paymentMode);
  }
  if (amountPaid !== undefined) {
    updates.push("amountPaid = ?");
    values.push(Number(amountPaid));
  }

  if (updates.length === 0) {
    throw { status: 400, message: "No fields to update" };
  }

  updates.push("updatedAt = NOW()");
  values.push(assignmentId);

  await pool.query(
    `UPDATE member_plan_assignment SET ${updates.join(", ")} WHERE id = ?`,
    values
  );

  const [[updated]] = await pool.query(
    "SELECT * FROM member_plan_assignment WHERE id = ?",
    [assignmentId]
  );

  return updated;
};

/**
 * Remove/deactivate a plan assignment
 */
export const removePlanAssignment = async (assignmentId) => {
  const [[existing]] = await pool.query(
    "SELECT * FROM member_plan_assignment WHERE id = ?",
    [assignmentId]
  );

  if (!existing) {
    throw { status: 404, message: "Plan assignment not found" };
  }

  // Soft delete - change status to Inactive
  await pool.query(
    "UPDATE member_plan_assignment SET status = 'Inactive', updatedAt = NOW() WHERE id = ?",
    [assignmentId]
  );

  return { message: "Plan assignment removed successfully" };
};

/**
 * Delete a plan assignment permanently
 */
export const deletePlanAssignment = async (assignmentId) => {
  const [result] = await pool.query(
    "DELETE FROM member_plan_assignment WHERE id = ?",
    [assignmentId]
  );

  if (result.affectedRows === 0) {
    throw { status: 404, message: "Plan assignment not found" };
  }

  return { message: "Plan assignment deleted permanently" };
};

/**
 * Get all members with a specific plan
 */
export const getMembersWithPlan = async (planId) => {
  const [members] = await pool.query(
    `SELECT 
      m.id,
      m.fullName,
      m.email,
      m.phone,
      m.status AS memberStatus,
      mpa.id AS assignmentId,
      mpa.membershipFrom,
      mpa.membershipTo,
      mpa.status AS planStatus,
      mpa.amountPaid,
      mpa.paymentMode,
      DATEDIFF(mpa.membershipTo, CURDATE()) AS remainingDays
    FROM member_plan_assignment mpa
    JOIN member m ON mpa.memberId = m.id
    WHERE mpa.planId = ?
    ORDER BY mpa.membershipFrom DESC`,
    [planId]
  );

  return members;
};

/**
 * Renew a plan assignment
 */
export const renewPlanAssignment = async (assignmentId, data) => {
  const { paymentMode, amountPaid } = data;

  const [[existing]] = await pool.query(
    `SELECT mpa.*, mp.validityDays, mp.price 
     FROM member_plan_assignment mpa
     JOIN memberplan mp ON mpa.planId = mp.id
     WHERE mpa.id = ?`,
    [assignmentId]
  );

  if (!existing) {
    throw { status: 404, message: "Plan assignment not found" };
  }

  // Calculate new dates
  const startDate = existing.membershipTo
    ? new Date(existing.membershipTo)
    : new Date();
  startDate.setDate(startDate.getDate() + 1);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Number(existing.validityDays || 30));

  // Update the assignment
  await pool.query(
    `UPDATE member_plan_assignment 
     SET membershipFrom = ?, 
         membershipTo = ?, 
         paymentMode = ?, 
         amountPaid = ?, 
         status = 'Active',
         updatedAt = NOW()
     WHERE id = ?`,
    [startDate, endDate, paymentMode, amountPaid || existing.price, assignmentId]
  );

  const [[updated]] = await pool.query(
    "SELECT * FROM member_plan_assignment WHERE id = ?",
    [assignmentId]
  );

  return updated;
};

