// src/modules/member/memberDashboard.controller.js
import { getMemberDashboardService } from "./memberDashboard.service.js";

export const getMemberDashboard = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const adminId = req.user.adminId; // Get adminId from authenticated user

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required in URL",
      });
    }

    const data = await getMemberDashboardService(memberId, adminId);

    return res.json({
      success: true,
      message: "Member dashboard fetched successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};
