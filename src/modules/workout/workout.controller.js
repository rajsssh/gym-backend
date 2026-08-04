import {
  createWorkoutPlanService,
  assignWorkoutPlanService,
  getMemberWorkoutPlanService,
} from "./workout.service.js";

export const createWorkoutPlan = async (req, res, next) => {
  try {
    const workout = await createWorkoutPlanService(req.body);
    res.json({ success: true, workout, data: workout });
  } catch (err) {
    console.error("Workout Creation Error:", err);
    res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
};

export const assignWorkoutPlan = async (req, res, next) => {
  try {
    const { memberId, workoutPlanId } = req.body;
    const assigned = await assignWorkoutPlanService(memberId, workoutPlanId);
    res.json({ success: true, assigned });
  } catch (err) {
    next(err);
  }
};

export const getMemberWorkoutPlan = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const plans = await getMemberWorkoutPlanService(memberId);
    res.json({ success: true, plans, data: plans });
  } catch (err) {
    next(err);
  }
};
