import { housekeepingDashboardService } from "./housekeepingdashboard.service.js";

// controller/housekeepingDashboard.controller.js
// controller/housekeepingDashboard.controller.js
// controller/housekeepingDashboard.controller.js
export const getHousekeepingDashboard = async (req, res, next) => {
  try {
    const adminId =
      req.query.adminId || req.body.adminId || req.params.adminId;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const data = await housekeepingDashboardService(Number(adminId));

    res.json({
      success: true,
      housekeepingDashboard: data,
    });
  } catch (err) {
    next(err);
  }
};



