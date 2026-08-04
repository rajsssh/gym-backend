import {
  checkInMemberService,
  checkOutMemberService,
  deleteAttendanceRecordService,
  getAllMembersByBranchService,
  getAttendanceByIdService,
  getClassPerformanceReportService,
  getDashboardDataService,
  getGroupTrainingPlansWithMembersService,
  getMemberBookingDetailsService,
  getMembersForPlanService,
} from "./generalTrainer.service.js";

export const getAllGroupTrainingPlans = async (req, res) => {
  try {
    // Get branchId from request parameters
    const adminId = parseInt(req.params.adminId || req.query.adminId);

    if (!adminId || isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Valid admin ID is required",
      });
    }

    const result = await getGroupTrainingPlansWithMembersService(adminId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching group training plans with members:", error);
    res.status(error.status || 500).json({
      success: false,
      message:
        error.message || "Failed to fetch group training plans with members",
    });
  }
};

export const getPlanMembers = async (req, res) => {
  try {
    // Get branchId and planId from request parameters
    const branchId = parseInt(req.params.branchId || req.query.branchId);
    const { planId } = req.params;

    if (!branchId || isNaN(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid branch ID is required",
      });
    }

    const result = await getMembersForPlanService(branchId, parseInt(planId));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching members for plan:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch members for plan",
    });
  }
};

export const getMemberBookings = async (req, res) => {
  try {
    // Get branchId and memberId from request parameters
    const branchId = parseInt(req.params.branchId || req.query.branchId);
    const { memberId } = req.params;

    if (!branchId || isNaN(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid branch ID is required",
      });
    }

    const result = await getMemberBookingDetailsService(branchId, memberId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching member booking details:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch member booking details",
    });
  }
};

export const getClassPerformanceReport = async (req, res) => {
  try {
    // ✅ adminId params ya query se lo
    const adminId = parseInt(req.params.adminId || req.query.adminId);

    if (!adminId || isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Valid admin ID is required",
      });
    }

    // ✅ adminId service ko pass karo
    const result = await getClassPerformanceReportService(adminId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching class performance report:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch class performance report",
    });
  }
};

export const getAttendanceById = async (req, res) => {
  try {
    const record = await getAttendanceByIdService(req.params.id);
    res.status(200).json(record);
  } catch (error) {
    console.error("Error fetching attendance record:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to fetch attendance record" });
  }
};

// Create a new attendance record (check-in)
export const checkInMember = async (req, res) => {
  try {
    const newRecord = await checkInMemberService(req.body);
    res.status(201).json(newRecord);
  } catch (error) {
    console.error("Error checking in member:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to check in member" });
  }
};

// Update an attendance record (check-out)
export const checkOutMember = async (req, res) => {
  try {
    // Pass both the ID from params and the body from the request to the service
    const updatedRecord = await checkOutMemberService(req.params.id, req.body);
    res.status(200).json(updatedRecord);
  } catch (error) {
    console.error("Error checking out member:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to check out member" });
  }
};

// Delete an attendance record
export const deleteAttendanceRecord = async (req, res) => {
  try {
    const result = await deleteAttendanceRecordService(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Failed to delete attendance record" });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const adminId = req.query.adminId || req.params.adminId;
    const attendancePeriod = req.query.attendancePeriod || req.query.period || "7days";

    if (!adminId) {
      return res.status(400).json({ message: "adminId is required" });
    }

    const dashboardData = await getDashboardDataService(adminId, attendancePeriod);

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(error.status || 500).json({
      message: error.message || "Failed to fetch dashboard data",
    });
  }
};

export const getAllMembersByBranch = async (req, res) => {
  try {
    // Get branchId from request parameters
    const branchId = parseInt(req.params.branchId || req.query.branchId);

    if (!branchId || isNaN(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid branch ID is required",
      });
    }

    const result = await getAllMembersByBranchService(branchId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching members by branch:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch members",
    });
  }
};
