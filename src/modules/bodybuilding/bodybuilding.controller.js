import * as BodybuildingService from './bodybuilding.service.js';
import { calculateBodyBuilderMetrics } from './bodyBuilderCalculation.service.js';
import { sendTemplatedNotification } from '../messageTemplates/messageTemplate.service.js';
import { pool } from '../../config/db.js';

export const createLog = async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!memberId) {
      return res.status(400).json({ status: false, message: 'memberId is required' });
    }

    if (!req.body.neck_cm || !req.body.waist_cm) {
      return res.status(400).json({ status: false, message: 'Neck (cm) and Waist (cm) are strictly required for Bodybuilder Assessments.' });
    }

    // Fetch the member to get the single source of truth for Goal, and details for notifications
    const [[member]] = await pool.query("SELECT * FROM member WHERE id = ?", [memberId]);
    if (!member) {
      return res.status(404).json({ status: false, message: 'Member not found' });
    }

    // Force goal to EXACTLY match member.goal (do not fallback to interestedIn as requested by user)
    let actualGoal = req.body.fitness_goal;
    const canonicalGoal = (member.goal || "").toLowerCase();
    if (canonicalGoal) {
      if (canonicalGoal.includes("body building") || canonicalGoal.includes("bodybuilding") || canonicalGoal.includes("bodybuilder")) {
        actualGoal = "Body Builder";
      } else if (canonicalGoal.includes("weight gain") || canonicalGoal.includes("muscle")) {
        actualGoal = "Muscle Gain";
      } else if (canonicalGoal.includes("fat loss") || canonicalGoal.includes("weight loss")) {
        actualGoal = "Fat Loss";
      } else if (canonicalGoal.includes("strength") || canonicalGoal.includes("maintenance")) {
        actualGoal = "Maintenance";
      } else {
        actualGoal = member.goal;
      }
    }

    // Run the calculation engine to calculate derived metrics and check validity
    let calculatedMetrics;
    try {
      calculatedMetrics = calculateBodyBuilderMetrics({
        gender: req.body.gender,
        age: req.body.age,
        weight_kg: req.body.weight_kg,
        height_cm: req.body.height_cm,
        neck_cm: req.body.neck_cm,
        waist_cm: req.body.waist_cm,
        hip_cm: req.body.hip_cm,
        activity_level: req.body.activity_level,
        fitness_goal: actualGoal,
        resting_hr: req.body.resting_hr
      });
    } catch (calcError) {
      return res.status(400).json({ status: false, message: calcError.message });
    }

    // Force the payload goal to match the member's profile goal
    const payload = { ...req.body, fitness_goal: actualGoal };
    const newLog = await BodybuildingService.logBodybuildingMetrics(memberId, payload);
    
    // Dispatch notifications
    try {
      const [[admin]] = await pool.query("SELECT id, gymName, email, phone FROM user WHERE id = ?", [member.adminId]);
      const gymName = admin?.gymName || "Our Gym";

      // Notify Member
      if (member.userId) {
        await sendTemplatedNotification({
          eventKey: 'PROGRESS_UPDATED',
          tenantId: member.adminId,
          receiverId: member.userId,
          receiverRole: 'Member',
          receiverEmail: member.email,
          receiverPhone: member.phone,
          variables: {
            MemberName: member.fullName,
            GymName: gymName
          },
          referenceType: 'BODYBUILDING_LOG',
          referenceId: newLog.id.toString(),
          actionUrl: '/member-dashboard'
        }).catch(err => console.error("Error sending PROGRESS_UPDATED to member:", err.message));
      }

      // Notify Trainer
      let trainerUser = null;
      if (member.trainerId) {
        const [[trainerAsUser]] = await pool.query("SELECT id, fullName, email, phone FROM user WHERE id = ?", [member.trainerId]);
        if (trainerAsUser) {
          trainerUser = trainerAsUser;
        } else {
          const [[staff]] = await pool.query("SELECT userId FROM staff WHERE id = ?", [member.trainerId]);
          if (staff) {
            const [[staffUser]] = await pool.query("SELECT id, fullName, email, phone FROM user WHERE id = ?", [staff.userId]);
            trainerUser = staffUser;
          }
        }

        if (trainerUser) {
          await sendTemplatedNotification({
            eventKey: 'CLIENT_PROGRESS_UPDATED',
            tenantId: member.adminId,
            receiverId: trainerUser.id,
            receiverRole: 'Trainer',
            receiverEmail: trainerUser.email,
            receiverPhone: trainerUser.phone,
            variables: {
              TrainerName: trainerUser.fullName,
              MemberName: member.fullName,
              GymName: gymName
            },
            referenceType: 'BODYBUILDING_LOG',
            referenceId: newLog.id.toString(),
            actionUrl: '/clients'
          }).catch(err => console.error("Error sending CLIENT_PROGRESS_UPDATED to trainer:", err.message));
        }
      }

      // Notify Admin
      if (admin && admin.id) {
        await sendTemplatedNotification({
          eventKey: 'ADMIN_PROGRESS_UPDATED',
          tenantId: member.adminId,
          receiverId: admin.id,
          receiverRole: 'Admin',
          receiverEmail: admin.email,
          receiverPhone: admin.phone,
          variables: {
            MemberName: member.fullName,
            GymName: gymName
          },
          referenceType: 'BODYBUILDING_LOG',
          referenceId: newLog.id.toString(),
          actionUrl: '/member'
        }).catch(err => console.error("Error sending ADMIN_PROGRESS_UPDATED to admin:", err.message));
      }
    } catch (notifErr) {
      console.error("Error dispatching bodybuilding notifications:", notifErr.message);
    }

    res.status(201).json({ 
      status: true, 
      message: 'Bodybuilding log added successfully', 
      data: { ...newLog, metrics: calculatedMetrics } 
    });
  } catch (error) {
    console.error("Error creating bodybuilding log:", error);
    res.status(500).json({ status: false, message: 'Internal Server Error', error: error.message });
  }
};

export const getLogs = async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!memberId) {
      return res.status(400).json({ status: false, message: 'memberId is required' });
    }

    const logs = await BodybuildingService.getBodybuildingLogs(memberId);
    
    // Map logs to include calculated metrics
    const logsWithMetrics = logs.map(log => {
      try {
        const metrics = calculateBodyBuilderMetrics({
          gender: log.gender,
          age: log.age,
          weight_kg: log.weight_kg,
          height_cm: log.height_cm,
          neck_cm: log.neck_cm,
          waist_cm: log.waist_cm,
          hip_cm: log.hip_cm,
          activity_level: log.activity_level,
          fitness_goal: log.fitness_goal,
          resting_hr: log.resting_hr
        });
        return { ...log, metrics };
      } catch (err) {
        console.error(`Calculation error for log ID ${log.id}:`, err.message);
        return { ...log, metrics: null, calculation_error: err.message };
      }
    });

    res.status(200).json({ status: true, message: 'Logs fetched successfully', data: logsWithMetrics });
  } catch (error) {
    console.error("Error fetching bodybuilding logs:", error);
    res.status(500).json({ status: false, message: 'Internal Server Error', error: error.message });
  }
};
