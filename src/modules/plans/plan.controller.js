import {
  createPlanService,
  listPlansService,
  updatePlanService,
  deletePlanService,
  getPlansByBranchService
} from "./plan.service.js";

export const createPlan = async (req, res, next) => {
  try {
    const plan = await createPlanService(req.body);
    res.json({ success: true, plan });
  } catch (err) {
    next(err);
  }
};

export const listPlans = async (req, res, next) => {
  try {
    const { duration } = req.query; // ?duration=Monthly

    const plans = await listPlansService(duration);

    res.json({ success: true, plans });
  } catch (err) {
    next(err);
  }
};


export const getPlansByBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    const plans = await getPlansByBranchService(branchId);

    res.json({
      success: true,
      plans,
    });

  } catch (err) {
    next(err);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid plan ID" });
    }

    const updatedPlan = await updatePlanService(id, req.body);

    res.json({
      success: true,
      message: "Plan updated successfully",
      plan: updatedPlan
    });
  } catch (err) {
    next(err);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid plan ID" });
    }

    await deletePlanService(id);

    res.json({ success: true, message: "Plan deleted" });
  } catch (err) {
    next(err);
  }
};
