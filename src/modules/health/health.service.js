import { pool } from "../../config/db.js";
import { sendWhatsAppMessage } from "../../utils/whatsappHelper.js";

/**
 * Calculate BMI and Status
 */
const calculateBMI = (weight, height) => {
  if (!weight || !height) return { bmi: null, bmiStatus: null };
  
  // If height is less than 10, assume it's in feet and convert to cm
  let actualHeightCm = parseFloat(height);
  if (actualHeightCm < 10) {
    actualHeightCm = actualHeightCm * 30.48;
  }
  
  // height in cm -> m
  const heightInMeters = actualHeightCm / 100;
  let bmi = (weight / (heightInMeters * heightInMeters)).toFixed(2);
  
  // Cap BMI at 999.99 because of database schema constraints
  if (parseFloat(bmi) > 999.99) {
    bmi = 999.99;
  }
  
  let bmiStatus = "Normal";
  if (bmi < 18.5) bmiStatus = "Underweight";
  else if (bmi >= 18.5 && bmi < 25.0) bmiStatus = "Normal";
  else if (bmi >= 25.0 && bmi < 30.0) bmiStatus = "Overweight";
  else if (bmi >= 30.0) bmiStatus = "Obese";

  return { bmi: parseFloat(bmi), bmiStatus };
};

/**
 * Add a new health log entry for a member
 */
export const addHealthLogService = async (data) => {
  const { memberId, trainerId, weight, height, notes, dietChart } = data;

  if (!memberId) {
    throw { status: 400, message: "memberId is required" };
  }

  const { bmi, bmiStatus } = calculateBMI(weight, height);

  const [result] = await pool.query(
    `INSERT INTO member_health_log (memberId, trainerId, weight, height, bmi, bmiStatus, status, notes, dietChart, recordedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [memberId, trainerId || null, weight || null, height || null, bmi, bmiStatus, bmiStatus, notes || null, dietChart || null]
  );

  // Fetch member info
  const [[member]] = await pool.query("SELECT fullName, email, phone, adminId FROM member WHERE id = ?", [memberId]);
  
  if (member) {
    // Send standard notification
    try {
      const { sendTemplatedNotification } = await import("../messageTemplates/messageTemplate.service.js");
      await sendTemplatedNotification({
        eventKey: 'HEALTH_LOG_ADDED',
        tenantId: member.adminId || null,
        receiverId: memberId,
        receiverRole: 'Member',
        receiverEmail: member.email,
        receiverPhone: member.phone,
        variables: {
          Name: member.fullName,
        },
        referenceType: 'HEALTH_LOG',
        referenceId: result.insertId.toString(),
        actionUrl: '/member-dashboard/health'
      });
    } catch (err) {
      console.error("Failed to send health log notification:", err.message);
    }
  }

  return {
    id: result.insertId,
    memberId,
    trainerId,
    weight,
    height,
    bmi,
    bmiStatus,
    notes,
    dietChart
  };
};

/**
 * Get health logs for a specific member (combining health logs & assessments)
 */
export const getMemberHealthLogsService = async (memberIdParam) => {
  const memberId = parseInt(memberIdParam, 10);
  if (!memberId) return [];

  // 1. Resolve realMemberId
  let realMemberId = memberId;
  try {
    const [mRows] = await pool.query(
      `SELECT id FROM member WHERE id = ? LIMIT 1`,
      [memberId]
    );
    if (mRows.length) {
      realMemberId = mRows[0].id;
    }
  } catch (e) {
    console.error("Error looking up member for health log:", e);
  }

  // 2. Fetch from member_health_log
  const [healthRows] = await pool.query(
    `SELECT h.id, h.memberId, h.weight, h.height, h.bmi, h.bmiStatus, h.notes, h.dietChart, h.recordedAt,
            m.fullName, m.phone
     FROM member_health_log h
     JOIN member m ON h.memberId = m.id
     WHERE h.memberId = ?
     ORDER BY h.recordedAt DESC`,
    [realMemberId]
  );

  // 3. Fetch from member_assessments
  const [assessmentRows] = await pool.query(
    `SELECT ma.id, ma.memberId, ma.weight_kg AS weight, ma.height_cm AS height, ma.bmi,
            ma.fitness_goal, ma.activity_level, ma.createdAt, ma.assessment_date,
            m.fullName, m.phone
     FROM member_assessments ma
     JOIN member m ON ma.memberId = m.id
     WHERE ma.memberId = ?
     ORDER BY ma.id DESC`,
    [realMemberId]
  );

  const formatBmiStatus = (bmiVal) => {
    const bmi = parseFloat(bmiVal);
    if (isNaN(bmi) || bmi <= 0) return 'Normal';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25.0) return 'Normal';
    if (bmi < 30.0) return 'Overweight';
    return 'Obese';
  };

  const combinedLogs = [];

  // Process member_health_log rows
  for (const h of healthRows) {
    combinedLogs.push({
      id: `h_${h.id}`,
      memberId: h.memberId,
      fullName: h.fullName || null,
      phone: h.phone || null,
      recordedAt: h.recordedAt || h.createdAt,
      weight: h.weight,
      height: h.height,
      bmi: h.bmi,
      bmiStatus: h.bmiStatus || h.status || formatBmiStatus(h.bmi),
      notes: h.notes || null,
      dietChart: h.dietChart || null,
      source: 'health_log'
    });
  }

  // Process member_assessments rows
  for (const a of assessmentRows) {
    const recordedAt = a.assessment_date || a.createdAt;
    const bmiVal = parseFloat(a.bmi);
    combinedLogs.push({
      id: `a_${a.id}`,
      memberId: a.memberId,
      fullName: a.fullName || null,
      phone: a.phone || null,
      recordedAt: recordedAt,
      weight: a.weight_kg || a.weight,
      height: a.height_cm || a.height,
      bmi: !isNaN(bmiVal) ? bmiVal.toFixed(2) : '-',
      bmiStatus: formatBmiStatus(a.bmi),
      notes: a.fitness_goal ? `Fitness Goal: ${a.fitness_goal.replace('_', ' ').toUpperCase()}${a.activity_level ? ` | Activity: ${a.activity_level}` : ''}` : null,
      dietChart: null,
      source: 'assessment'
    });
  }

  // 4. No fallback dummy data - return empty if no real logs exist

  // Sort descending by date
  combinedLogs.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

  return combinedLogs;
};

/**
 * Get all health logs (for initial table load)
 */
export const getAllHealthLogsService = async (adminId) => {
  const [rows] = await pool.query(
    `SELECT h.*, m.fullName, m.phone 
     FROM member_health_log h
     JOIN member m ON h.memberId = m.id
     WHERE m.adminId = ?
     ORDER BY h.recordedAt DESC`,
     [adminId]
  );
  return rows;
};

/**
 * Get all health logs for members assigned to a specific trainer
 */
export const getHealthLogsByTrainerIdService = async (trainerId) => {
  const [rows] = await pool.query(
    `SELECT h.*, m.fullName, m.phone 
     FROM member_health_log h
     JOIN member m ON h.memberId = m.id
     WHERE m.id IN (
       SELECT DISTINCT m2.id FROM member m2
       LEFT JOIN memberplan p ON m2.planId = p.id
       WHERE p.trainerId = ?
     )
     ORDER BY h.recordedAt DESC`,
    [trainerId]
  );
  return rows;
};

/**
 * Update an existing health log
 */
export const updateHealthLogService = async (idParam, data) => {
  const { weight, height, notes, dietChart } = data;
  const isAssessment = String(idParam).startsWith('a_');
  const numericId = parseInt(String(idParam).replace(/^h_|^a_/, ''), 10);

  if (isAssessment) {
    const [[existing]] = await pool.query("SELECT * FROM member_assessments WHERE id = ?", [numericId]);
    if (!existing) {
      throw { status: 404, message: "Health log not found" };
    }
    const newWeight = weight !== undefined ? weight : existing.weight_kg;
    const newHeight = height !== undefined ? height : existing.height_cm;
    const { bmi } = calculateBMI(newWeight, newHeight);

    await pool.query(
      `UPDATE member_assessments SET weight_kg = ?, height_cm = ?, bmi = ? WHERE id = ?`,
      [newWeight, newHeight, bmi, numericId]
    );
    const [[updatedLog]] = await pool.query("SELECT * FROM member_assessments WHERE id = ?", [numericId]);
    return updatedLog;
  }

  const [[existing]] = await pool.query("SELECT * FROM member_health_log WHERE id = ?", [numericId]);
  if (!existing) {
    throw { status: 404, message: "Health log not found" };
  }

  // Calculate new BMI if weight or height changed
  const newWeight = weight !== undefined ? weight : existing.weight;
  const newHeight = height !== undefined ? height : existing.height;
  const { bmi, bmiStatus } = calculateBMI(newWeight, newHeight);

  await pool.query(
    `UPDATE member_health_log SET 
      weight = ?,
      height = ?,
      bmi = ?,
      status = ?,
      notes = COALESCE(?, notes),
      dietChart = COALESCE(?, dietChart)
     WHERE id = ?`,
    [newWeight, newHeight, bmi, bmiStatus, notes !== undefined ? notes : null, dietChart !== undefined ? dietChart : null, numericId]
  );

  const [[updatedLog]] = await pool.query("SELECT * FROM member_health_log WHERE id = ?", [numericId]);
  return updatedLog;
};

/**
 * Delete a health log
 */
export const deleteHealthLogService = async (idParam) => {
  const isAssessment = String(idParam).startsWith('a_');
  const numericId = parseInt(String(idParam).replace(/^h_|^a_/, ''), 10);

  const table = isAssessment ? "member_assessments" : "member_health_log";
  const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [numericId]);
  if (result.affectedRows === 0) {
    throw { status: 404, message: "Health log not found" };
  }
  return true;
};
