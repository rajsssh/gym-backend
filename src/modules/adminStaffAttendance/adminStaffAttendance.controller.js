import {
  createStaffAttendanceService,
  deleteStaffAttendanceService,
  getAllStaffAttendanceService,
  getStaffAttendanceByBranchIdService,
  getStaffAttendanceByIdService,
  updateStaffAttendanceService,
} from "./adminStaffAttendance.service.js";

export const createStaffAttendance = async (req, res) => {
  try {
    const attendanceData = req.body;
    const result = await createStaffAttendanceService(attendanceData);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to create staff attendance record",
    });
  }
};

/**************************************
 * GET STAFF ATTENDANCE BY ID CONTROLLER
 **************************************/
export const getStaffAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getStaffAttendanceByIdService(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to get staff attendance record",
    });
  }
};

/**************************************
 * GET STAFF ATTENDANCE BY BRANCH ID CONTROLLER
 **************************************/
export const getStaffAttendanceByBranchId = async (req, res) => {
  try {
    const { branchId } = req.params;
    const options = req.query;
    const result = await getStaffAttendanceByBranchIdService(branchId, options);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to get staff attendance records",
    });
  }
};

/**************************************
 * UPDATE STAFF ATTENDANCE CONTROLLER
 **************************************/
export const updateStaffAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const result = await updateStaffAttendanceService(id, updateData);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to update staff attendance record",
    });
  }
};

/**************************************
 * DELETE STAFF ATTENDANCE CONTROLLER
 **************************************/
export const deleteStaffAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteStaffAttendanceService(id);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to delete staff attendance record",
    });
  }
};

/**************************************
 * GET ALL STAFF ATTENDANCE CONTROLLER
 **************************************/
export const getAllStaffAttendance = async (req, res) => {
  try {
    const options = req.query;
    const result = await getAllStaffAttendanceService(options);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Failed to get staff attendance records",
    });
  }
};
