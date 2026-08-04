import {
  deleteMemberPlan,
  getAllMemberPlansService,
  getMemberPlanById,
  getMemberPlansByAdminIdService,
  saveMemberPlan,
  updateMemberPlan
} from "../memberplan/memberPlan.service.js";

export const createMemberPlan = async (req, res, next) => {
  try {
    const data = await saveMemberPlan(req.body);
    res.json({ success: true, plan: data });
  } catch (err) {
    next(err);
  }
};

export const getMemberPlans = async (req, res, next) => { 
  try {
    let adminId = req.query.adminId || req.user?.adminId || req.user?.id;
    if (!adminId) throw { status: 400, message: "adminId is required" };

    // First try to get plans for the provided adminId
    let plans = await getMemberPlansByAdminIdService(adminId);

    // If no plans found, check if this user is a staff member and resolve their admin's plans
    if (plans.length === 0) {
      const { pool } = await import("../../config/db.js");
      const [[userRow]] = await pool.query(
        "SELECT adminId, roleId FROM user WHERE id = ?",
        [Number(adminId)]
      );
      // If the user is a staff member (roleId 5-10) and has an adminId, use that
      if (userRow && userRow.adminId && Number(userRow.roleId) >= 5) {
        plans = await getMemberPlansByAdminIdService(userRow.adminId);
      }
    }

    res.json({ success: true, plans });
  } catch (err) {
    next(err);
  }
};






export const getMemberPlansnewss = async (req, res) => {
  try {
    const plans = await getAllMemberPlansService();

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Get Member Plans Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// 🔹 GET: /api/memberplan/2  => single plan by id
export const getMemberPlan = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await getMemberPlanById(id);

    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    res.json({ success: true, plan: data });
  } catch (err) {
    next(err);
  }
};

// export const updatePlan = async (req, res, next) => {
//   try {
//     const adminId = req.user.id;
//     const data = await updateMemberPlan(Number(req.params.id), req.body, adminId);

//     res.json({
//       success: true,
//       message: "Plan updated successfully",
//       plan: data
//     });
//   } catch (err) {
//     next(err);
//   }
// };


export const updatePlan = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    const planId = Number(req.params.planId);

    const updated = await updateMemberPlan(planId, req.body, adminId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Plan not found OR adminId does not match"
      });
    }

    res.json({
      success: true,
      message: "Plan updated successfully",
      plan: updated
    });

  } catch (err) {
    next(err);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const planId = Number(req.params.id);

    if (Number.isNaN(planId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid plan ID" });
    }

    await deleteMemberPlan(planId);

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (err) {
    // agar custom error hai (404 etc.)
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    next(err);
  }
};