import {
  assignPlansToMember,
  getMemberPlanAssignments,
  getActiveMemberPlans,
  updatePlanAssignment,
  removePlanAssignment,
  deletePlanAssignment,
  getMembersWithPlan,
  renewPlanAssignment,
} from "./memberPlanAssignment.service.js";

/**
 * POST /api/member-plan-assignments/assign
 * Assign multiple plans to a member
 */
export const assignPlans = async (req, res, next) => {
  try {
    const { memberId, plans, assignedBy } = req.body;

    const result = await assignPlansToMember({ memberId, plans, assignedBy });

    res.status(201).json({
      success: true,
      message: result.message,
      data: result.assignments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/member-plan-assignments/member/:memberId
 * Get all plan assignments for a member
 */
export const getMemberAssignments = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);

    const assignments = await getMemberPlanAssignments(memberId);

    res.json({
      success: true,
      data: assignments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/member-plan-assignments/member/:memberId/active
 * Get active plan assignments for a member
 */
export const getActivePlans = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);

    const assignments = await getActiveMemberPlans(memberId);

    res.json({
      success: true,
      data: assignments,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/member-plan-assignments/:id
 * Update a plan assignment
 */
export const updateAssignment = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const data = req.body;

    const updated = await updatePlanAssignment(assignmentId, data);

    res.json({
      success: true,
      message: "Plan assignment updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/member-plan-assignments/:id
 * Remove (soft delete) a plan assignment
 */
export const removeAssignment = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id);

    const result = await removePlanAssignment(assignmentId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/member-plan-assignments/:id/permanent
 * Permanently delete a plan assignment
 */
export const deleteAssignmentPermanently = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id);

    const result = await deletePlanAssignment(assignmentId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/member-plan-assignments/plan/:planId/members
 * Get all members with a specific plan
 */
export const getPlanMembers = async (req, res, next) => {
  try {
    const planId = parseInt(req.params.planId);

    const members = await getMembersWithPlan(planId);

    res.json({
      success: true,
      data: members,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/member-plan-assignments/:id/renew
 * Renew a plan assignment
 */
export const renewAssignment = async (req, res, next) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const { paymentMode, amountPaid } = req.body;

    const result = await renewPlanAssignment(assignmentId, {
      paymentMode,
      amountPaid,
    });

    res.json({
      success: true,
      message: "Plan renewed successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

