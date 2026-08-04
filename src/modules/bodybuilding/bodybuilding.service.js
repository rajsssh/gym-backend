import { pool } from "../../config/db.js";

export const logBodybuildingMetrics = async (memberId, data) => {
  if (!memberId) {
    throw new Error("Missing required field: Member is required");
  }

  const parsedAge = data.age !== undefined && data.age !== null && data.age !== '' ? parseInt(data.age) : null;
  const parsedWeight = data.weight_kg !== undefined && data.weight_kg !== null && data.weight_kg !== '' ? parseFloat(data.weight_kg) : null;
  const parsedHeight = data.height_cm !== undefined && data.height_cm !== null && data.height_cm !== '' ? parseFloat(data.height_cm) : null;
  const parsedNeck = data.neck_cm !== undefined && data.neck_cm !== null && data.neck_cm !== '' ? parseFloat(data.neck_cm) : null;
  const parsedWaist = data.waist_cm !== undefined && data.waist_cm !== null && data.waist_cm !== '' ? parseFloat(data.waist_cm) : null;
  const parsedHip = data.hip_cm !== undefined && data.hip_cm !== null && data.hip_cm !== '' ? parseFloat(data.hip_cm) : null;

  const [result] = await pool.query(
    `INSERT INTO member_bodybuilding_logs (
      memberId,
      weight_kg,
      chest_cm,
      shoulders_cm,
      left_arm_cm,
      right_arm_cm,
      left_forearm_cm,
      right_forearm_cm,
      waist_cm,
      thighs_cm,
      calves_cm,
      front_photo_url,
      back_photo_url,
      side_photo_url,
      notes,
      gender,
      age,
      height_cm,
      neck_cm,
      hip_cm,
      activity_level,
      fitness_goal,
      biceps_cm,
      forearms_cm,
      assessment_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parseInt(memberId),
      isNaN(parsedWeight) ? null : parsedWeight,
      data.chest_cm ? parseFloat(data.chest_cm) : null,
      data.shoulders_cm ? parseFloat(data.shoulders_cm) : null,
      data.biceps_cm ? parseFloat(data.biceps_cm) : null, // left_arm_cm
      data.biceps_cm ? parseFloat(data.biceps_cm) : null, // right_arm_cm
      data.forearms_cm ? parseFloat(data.forearms_cm) : null, // left_forearm_cm
      data.forearms_cm ? parseFloat(data.forearms_cm) : null, // right_forearm_cm
      isNaN(parsedWaist) ? null : parsedWaist,
      data.thighs_cm ? parseFloat(data.thighs_cm) : null,
      data.calves_cm ? parseFloat(data.calves_cm) : null,
      data.front_photo_url || null,
      data.back_photo_url || null,
      data.side_photo_url || null,
      data.notes || null,
      data.gender || null,
      isNaN(parsedAge) ? null : parsedAge,
      isNaN(parsedHeight) ? null : parsedHeight,
      isNaN(parsedNeck) ? null : parsedNeck,
      isNaN(parsedHip) ? null : parsedHip,
      data.activity_level || null,
      data.fitness_goal || null,
      data.biceps_cm ? parseFloat(data.biceps_cm) : null,
      data.forearms_cm ? parseFloat(data.forearms_cm) : null,
      data.assessment_date ? new Date(data.assessment_date) : new Date()
    ]
  );

  const [[newLog]] = await pool.query(
    `SELECT * FROM member_bodybuilding_logs WHERE id = ?`,
    [result.insertId]
  );
  return newLog;
};

export const getBodybuildingLogs = async (memberId) => {
  const [rows] = await pool.query(
    `SELECT * FROM member_bodybuilding_logs WHERE memberId = ? ORDER BY assessment_date DESC, log_date DESC`,
    [parseInt(memberId)]
  );
  return rows;
};
