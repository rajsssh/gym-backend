import {
  generateGeneralTrainerReportService,
  generateMemberReportService,
  generatePersonalTrainerReportService,
  getReceptionReportService,
  getMemberAttendanceReportService,
  generateManagerReportService,
  generatePersonalTrainerReportByStaffService,
  generateGeneralTrainerReportByStaffService,
  generateStaffHousekeepingReportService,
  generateAdminHousekeepingReportService,
} from "./reports.service.js";
// import { generateGeneralTrainerReportService, generateManagerReportService, generateMemberReportService, generatePersonalTrainerReportService ,getReceptionReportService} from "./reports.service.js";

// Generate Member Report Controller
export const generateMemberReportController = async (req, res) => {
  try {
    const { adminId, fromDate, toDate, status } = req.query;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }

    const reportData = await generateMemberReportService(adminId, fromDate, toDate, status);

    res.status(200).json({
      success: true,
      message: "Member report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("Error in generateMemberReportController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate member report",
      error: error.message,
    });
  }
};

export const generatePersonalTrainerReportController = async (req, res) => {
  try {
    const { adminId, fromDate, toDate, status } = req.query;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }

    const reportData = await generatePersonalTrainerReportService(adminId, fromDate, toDate, status);

    res.status(200).json({
      success: true,
      message: "Personal trainer report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("Error in generatePersonalTrainerReportController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate personal trainer report",
      error: error.message,
    });
  }
};

export const generateGeneralTrainerReportController = async (req, res) => {
  try {
    const { adminId, fromDate, toDate, status } = req.query;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }

    const reportData = await generateGeneralTrainerReportService(adminId, fromDate, toDate, status);

    res.status(200).json({
      success: true,
      message: "General trainer report generated successfully",
      data: reportData,
    });
  } catch (error) {
    console.error("Error in generateGeneralTrainerReportController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate general trainer report",
      error: error.message,
    });
  }
};

// import { getReceptionReportService } from "./receptionReport.service.js";

export const getReceptionReportForAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const report = await getReceptionReportService(adminId);

    if (report.error) {
      return res.status(404).json({ success: false, message: report.error });
    }

    return res.json({
      success: true,
      ...report,
    });
  } catch (error) {
    console.error("Reception Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getMemberAttendanceReport = async (req, res) => {
  try {
    const { adminId } = req.params;

    const data = await getMemberAttendanceReportService(adminId);

    if (data.error) {
      return res.status(404).json({ success: false, message: data.error });
    }

    return res.json({ success: true, ...data });
  } catch (err) {
    console.log("Attendance Report Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getManagerReportController = async (req, res) => {
  try {
    const { adminId } = req.query;

    if (!adminId) {
      return res.status(400).json({ message: "Admin ID missing" });
    }

    const report = await generateManagerReportService(adminId);

    return res.status(200).json({
      success: true,
      message: "Manager report fetched successfully",
      data: report,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const generatePersonalTrainerReportByStaffController = async (
  req,
  res
) => {
  try {
    const { adminId, staffId } = req.params;
    const { fromDate, toDate } = req.query; // Get dates from query parameters

    // Validate input
    if (!adminId || !staffId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and Staff ID are required",
      });
    }

    const report = await generatePersonalTrainerReportByStaffService(
      adminId,
      staffId,
      fromDate,
      toDate
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const generateGeneralTrainerReportByStaffController = async (
  req,
  res
) => {
  try {
    const { adminId, staffId } = req.params;
    const { fromDate, toDate } = req.query; // Get dates from query parameters

    // Validate input
    if (!adminId || !staffId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and Staff ID are required",
      });
    }

    const report = await generateGeneralTrainerReportByStaffService(
      adminId,
      staffId,
      fromDate,
      toDate
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAdminHousekeepingReport = async (req, res) => {
  try {
    const adminId = req.user?.id || req.params.adminId;
    const { startDate, endDate } = req.query;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const report = await generateAdminHousekeepingReportService(
      adminId,
      startDate,
      endDate
    );

    return res.status(200).json({
      success: true,
      message: "Admin housekeeping report generated successfully",
      data: report,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get housekeeping report for a specific staff member under an admin
export const getStaffHousekeepingReport = async (req, res) => {
  try {
    const adminId = req.user?.id || req.params.adminId;
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    // 🔒 Validation (LIVE FIX)
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: "staffId is required",
      });
    }

    const report = await generateStaffHousekeepingReportService(
      adminId,
      staffId,
      startDate,
      endDate
    );

    return res.status(200).json({
      success: true,
      message: "Staff housekeeping report generated successfully",
      data: report,
    });
  } catch (error) {
    console.error("STAFF REPORT CONTROLLER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate staff housekeeping report",
    });
  }
};
