import { PrismaClient } from '@prisma/client';
import { AssessmentEngine } from './assessment.engine.js';
import { validateAssessmentInputs } from './assessment.validator.js';
import { LeaderboardEngine } from '../leaderboard/leaderboard.engine.js';
import { dispatchNotification } from "../../utils/notificationDispatcher.js";
import { sendAppNotification } from "../../utils/notificationHelper.js";
import { pool } from "../../config/db.js";

const prisma = new PrismaClient();
const engine = new AssessmentEngine();

export const createAssessment = async (data, createdBy) => {
  // Validate Inputs
  const validation = validateAssessmentInputs(data);
  if (!validation.isValid) {
    const error = new Error('Validation Failed');
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  // Check if member exists
  const member = await prisma.member.findUnique({ 
    where: { id: data.memberId },
    select: { email: true, phone: true, fullName: true, id: true }
  });
  if (!member) {
    const error = new Error('Member not found');
    error.status = 404;
    throw error;
  }

  // Calculate Metrics
  const calculated = engine.calculateAll(data);
  
  // Leaderboard Calculation
  const baselineAssessment = await prisma.member_assessments.findFirst({
    where: { memberId: data.memberId, is_baseline: true }
  });

  const demographic_multiplier = LeaderboardEngine.getDemographicMultiplier(data.age_at_assessment, data.gender_at_assessment);
  
  const is_baseline = !baselineAssessment;
  const baseline_bf  = baselineAssessment ? Number(baselineAssessment.body_fat_percentage) : calculated.metrics.body_fat_percentage;
  const baseline_lbm = baselineAssessment ? Number(baselineAssessment.lean_body_mass)       : calculated.metrics.lean_body_mass;
  const current_bf   = calculated.metrics.body_fat_percentage;
  const current_lbm  = calculated.metrics.lean_body_mass;

  // Calculate all 3 goal scores — spec: no demographic multipliers
  const { fat_loss_score, muscle_gain_score, maintenance_score } = LeaderboardEngine.calculateAllScores({
    baseline_bf,  current_bf,
    baseline_lbm, current_lbm
  });

  // final_leaderboard_score = the score for the member's chosen goal
  const final_leaderboard_score = LeaderboardEngine.calculateScore({
    fitness_goal: data.fitness_goal,
    baseline_bf,  current_bf,
    baseline_lbm, current_lbm
  });

  // Map to DB via Prisma using validated schema fields
  const newAssessment = await prisma.member_assessments.create({
    data: {
      memberId: data.memberId,
      createdBy: createdBy || 1,
      engine_version: engine.config.ENGINE_VERSION,
      config_snapshot: JSON.stringify(engine.config),
      
      // Inputs
      age_at_assessment: data.age_at_assessment,
      gender_at_assessment: data.gender_at_assessment,
      weight_kg: data.weight_kg,
      height_cm: data.height_cm,
      neck_cm: data.neck_cm,
      waist_cm: data.waist_cm,
      hip_cm: data.hip_cm,
      resting_hr: data.resting_hr,
      activity_level: data.activity_level,
      fitness_goal: data.fitness_goal,
      
      // Output Metrics
      bmi: calculated.metrics.bmi,
      body_fat_percentage: calculated.metrics.body_fat_percentage,
      lean_body_mass: calculated.metrics.lean_body_mass,
      ideal_body_weight: calculated.metrics.ideal_body_weight,
      waist_to_hip_ratio: calculated.metrics.waist_to_hip_ratio,
      bmr: calculated.metrics.bmr,
      tdee: calculated.metrics.tdee,
      target_calories: calculated.metrics.target_calories,
      
      // Macros
      protein_grams: calculated.macros.protein_grams,
      fat_grams: calculated.macros.fat_grams,
      carb_grams: calculated.macros.carb_grams,
      
      // Leaderboard Data
      is_baseline: is_baseline,
      baseline_bf_percent: baseline_bf,
      baseline_lbm: baseline_lbm,
      demographic_multiplier: demographic_multiplier,
      final_leaderboard_score: final_leaderboard_score,

      // Dashboard metadata
      metrics_output: JSON.stringify(calculated.dashboard_data)
    }
  });

  // Optional: Update extra leaderboard columns directly in MySQL if present
  try {
    await pool.query(
      `UPDATE member_assessments 
       SET current_bf_percent = ?, current_lbm = ?, fat_loss_score = ?, muscle_gain_score = ?, maintenance_score = ? 
       WHERE id = ?`,
      [current_bf, current_lbm, fat_loss_score, muscle_gain_score, maintenance_score, newAssessment.id]
    );
  } catch (err) {
    // Ignore if columns are not present or optional
  }

  // 1. Dispatch General Progress Report
  const reportMessage = `Hi ${member.fullName},\n\nYour new fitness assessment is ready!\n\nMetrics:\nBMI: ${calculated.metrics.bmi}\nBody Fat: ${calculated.metrics.body_fat_percentage}%\nLean Body Mass: ${calculated.metrics.lean_body_mass} kg\nTarget Calories: ${calculated.metrics.target_calories} kcal\n\nKeep up the great work!`;
  
  if (member.email) {
    dispatchNotification({
      category: "templates",
      toEmail: member.email,
      toPhone: member.phone,
      memberId: member.id,
      subject: "Your New Fitness Assessment Report",
      message: reportMessage
    }).catch(err => console.error("Failed to send assessment email notification:", err));
  }

  if (member.phone && !member.email) { // if email was there, phone was already covered above, but let's be safe
    dispatchNotification({
      category: "templates",
      toEmail: member.email,
      toPhone: member.phone,
      memberId: member.id,
      subject: "Your New Fitness Assessment Report",
      message: reportMessage
    }).catch(err => console.error("Failed to send assessment whatsapp notification:", err));
  }

  // App Notification for Leaderboard Update
  if (member.userId) {
    sendAppNotification(member.userId, `Your new fitness assessment is recorded! Your leaderboard score was updated (Score: ${final_leaderboard_score}).`, {
      title: "Leaderboard Updated",
      reference_type: "LEADERBOARD",
      reference_id: newAssessment.id
    }).catch(err => console.error("Failed to send app notification for assessment leaderboard:", err));
  }


  // 2. Dispatch Milestone/Target Reached Alert (if body fat percentage drops below 15%)
  if (calculated.metrics.body_fat_percentage <= 15) {
    const milestoneMessage = `🔥 Milestone Reached! Congratulations ${member.fullName}, your body fat percentage is now down to ${calculated.metrics.body_fat_percentage}%! Exceptional progress!`;
    
    if (member.phone || member.email) {
      dispatchNotification({
        category: "templates",
        toEmail: member.email,
        toPhone: member.phone,
        memberId: member.id,
        subject: "Fitness Milestone Reached!",
        message: milestoneMessage
      }).catch(err => console.error("Failed to send milestone notification:", err));
    }
  }

  return newAssessment;
};

export const getMemberAssessments = async (memberId) => {
  const parsedId = parseInt(memberId);
  if (isNaN(parsedId)) return [];
  return await prisma.member_assessments.findMany({
    where: { memberId: parsedId },
    orderBy: { assessment_date: 'desc' }
  });
};

export const getLatestAssessment = async (memberIdParam) => {
  const memberId = parseInt(memberIdParam, 10);
  if (!memberId) return null;

  // 1. Resolve realMemberId & member profile details
  let realMemberId = memberId;
  let memberDetails = null;

  try {
    const [mRows] = await pool.query(
      `SELECT id, fullName, gender, dateOfBirth, joinDate, branchId FROM member WHERE id = ? LIMIT 1`,
      [memberId]
    );
    if (mRows.length) {
      realMemberId = mRows[0].id;
      memberDetails = mRows[0];
    }
  } catch (e) {
    console.error("Error looking up member for latest assessment:", e);
  }

  // 2. Query member_assessments
  const [assessments] = await pool.query(
    `SELECT * FROM member_assessments WHERE memberId = ? ORDER BY assessment_date DESC LIMIT 1`,
    [realMemberId]
  );

  if (assessments.length > 0) {
    const result = assessments[0];
    let dashboardData = {};
    if (result.metrics_output) {
      try {
        dashboardData = typeof result.metrics_output === 'string'
          ? JSON.parse(result.metrics_output)
          : result.metrics_output;
      } catch (e) {
        console.error("Error parsing metrics_output:", e);
      }
    }

    return {
      ...result,
      assessment_date: result.assessment_date || result.createdAt,
      metrics: {
        bmi: result.bmi ? parseFloat(result.bmi) : '-',
        body_fat_percentage: result.body_fat_percentage ? parseFloat(result.body_fat_percentage) : '-',
        lean_body_mass: result.lean_body_mass ? parseFloat(result.lean_body_mass) : '-',
        ideal_body_weight: result.ideal_body_weight ? parseFloat(result.ideal_body_weight) : '-',
        waist_to_hip_ratio: result.waist_to_hip_ratio ? parseFloat(result.waist_to_hip_ratio) : null,
        bmr: result.bmr ? Math.round(result.bmr) : '-',
        tdee: result.tdee ? Math.round(result.tdee) : '-',
        target_calories: result.target_calories ? Math.round(result.target_calories) : '-'
      },
      inputs: {
        fitness_goal: result.fitness_goal || 'fat_loss',
        weight_kg: result.weight_kg ? parseFloat(result.weight_kg) : '-',
        height_cm: result.height_cm ? parseFloat(result.height_cm) : '-',
        neck_cm: result.neck_cm,
        waist_cm: result.waist_cm,
        hip_cm: result.hip_cm,
        resting_hr: result.resting_hr || 72,
        activity_level: result.activity_level || 'moderate'
      },
      macros: {
        protein_grams: result.protein_grams ? Math.round(result.protein_grams) : 0,
        fat_grams: result.fat_grams ? Math.round(result.fat_grams) : 0,
        carb_grams: result.carb_grams ? Math.round(result.carb_grams) : 0
      },
      dashboard_data: dashboardData
    };
  }

  // 3. Check member_health_log
  const [healthLogs] = await pool.query(
    `SELECT * FROM member_health_log WHERE memberId = ? OR memberId = ? ORDER BY recordedAt DESC LIMIT 1`,
    [realMemberId, memberId]
  );

  if (healthLogs.length > 0) {
    const h = healthLogs[0];
    let weight = parseFloat(h.weight) || 70;
    let height = parseFloat(h.height) || 170;
    let gender = (memberDetails?.gender || 'male').toLowerCase();
    let age = 25;
    let recordedDate = h.recordedAt || h.createdAt || memberDetails?.joinDate || new Date();

    if (memberDetails?.dateOfBirth) {
      const dob = new Date(memberDetails.dateOfBirth);
      const diff = Date.now() - dob.getTime();
      const computedAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      if (computedAge > 5 && computedAge < 100) age = computedAge;
    }

    const waist = gender === 'female' ? 75 : Math.max(30, weight - 5);
    const neck = gender === 'female' ? 35 : Math.max(30, waist - 10);
    const hip = gender === 'female' ? waist + 10 : null;

    const calculated = engine.calculateAll({
      age_at_assessment: age,
      gender_at_assessment: gender,
      weight_kg: weight,
      height_cm: height,
      neck_cm: neck,
      waist_cm: waist,
      hip_cm: hip,
      resting_hr: 72,
      activity_level: 'moderate',
      fitness_goal: 'fat_loss'
    });

    return {
      id: null,
      memberId: realMemberId,
      assessment_date: recordedDate,
      fitness_goal: 'fat_loss',
      metrics: calculated.metrics,
      inputs: {
        fitness_goal: 'fat_loss',
        weight_kg: weight,
        height_cm: height,
        neck_cm: neck,
        waist_cm: waist,
        hip_cm: hip,
        resting_hr: 72,
        activity_level: 'moderate'
      },
      macros: calculated.macros,
      dashboard_data: calculated.dashboard_data
    };
  }

  return null;
};

export const getAssessmentHistory = async (memberIdParam) => {
  const memberId = parseInt(memberIdParam, 10);
  if (!memberId) return [];

  // 1. Resolve realMemberId from member table
  let realMemberId = memberId;
  let memberDetails = null;

  try {
    const [mRows] = await pool.query(
      `SELECT id, fullName, joinDate, branchId FROM member WHERE id = ? LIMIT 1`,
      [memberId]
    );
    if (mRows.length) {
      realMemberId = mRows[0].id;
      memberDetails = mRows[0];
    }
  } catch (e) {
    console.error("Error finding member for history:", e);
  }

  // 2. Fetch from member_assessments
  const [assessmentRecords] = await pool.query(
    `SELECT ma.* FROM member_assessments ma
     WHERE ma.memberId = ?
     ORDER BY ma.assessment_date ASC`,
    [realMemberId]
  );

  // 3. Fetch from member_health_log
  const [healthRecords] = await pool.query(
    `SELECT h.* FROM member_health_log h
     WHERE h.memberId = ?
     ORDER BY h.recordedAt ASC`,
    [realMemberId]
  );

  const historyMap = {};

  // Add member_assessments records
  assessmentRecords.forEach(record => {
    const dateKey = new Date(record.assessment_date || record.createdAt).toISOString().split('T')[0];
    historyMap[dateKey] = {
      assessment_date: record.assessment_date || record.createdAt,
      weight_kg: parseFloat(record.weight_kg) || 0,
      body_fat_percentage: parseFloat(record.body_fat_percentage) || 0,
      lean_body_mass: parseFloat(record.lean_body_mass) || 0,
      bmi: parseFloat(record.bmi) || 0,
      fitness_goal: record.fitness_goal || 'fat_loss',
      inputs: {
        fitness_goal: record.fitness_goal || 'fat_loss',
        weight_kg: parseFloat(record.weight_kg) || 0,
        height_cm: parseFloat(record.height_cm) || 170
      },
      metrics: {
        body_fat_percentage: parseFloat(record.body_fat_percentage) || 0,
        lean_body_mass: parseFloat(record.lean_body_mass) || 0,
        bmi: parseFloat(record.bmi) || 0
      }
    };
  });

  // Add member_health_log records
  healthRecords.forEach(h => {
    const dateKey = new Date(h.recordedAt || h.createdAt).toISOString().split('T')[0];
    if (!historyMap[dateKey]) {
      const weight = parseFloat(h.weight) || 70;
      const height = parseFloat(h.height) || 170;
      const bmi = parseFloat(h.bmi) || 22.5;
      const estimatedBf = h.bmiStatus === 'Underweight' ? 12 : h.bmiStatus === 'Overweight' ? 26 : h.bmiStatus === 'Obese' ? 32 : 18;
      const leanMass = (weight * (1 - estimatedBf / 100)).toFixed(1);

      const goalVal = (h.fitness_goal || memberDetails?.goal || 'maintenance').toLowerCase().replace(/\s+/g, '_');
      historyMap[dateKey] = {
        assessment_date: h.recordedAt || h.createdAt,
        weight_kg: weight,
        body_fat_percentage: estimatedBf,
        lean_body_mass: parseFloat(leanMass),
        bmi: bmi,
        fitness_goal: goalVal,
        inputs: {
          fitness_goal: goalVal,
          weight_kg: weight,
          height_cm: height
        },
        metrics: {
          body_fat_percentage: estimatedBf,
          lean_body_mass: parseFloat(leanMass),
          bmi: bmi
        }
      };
    }
  });

  let historyList = Object.values(historyMap);
  historyList.sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date));

  return historyList;
};
