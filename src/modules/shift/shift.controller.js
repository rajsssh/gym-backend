

import {
  createShiftService,
  getAllShiftsService,
  getShiftByIdService,
  updateShiftService,
  deleteShiftService,
  getShiftByShiftIdService,
  getShiftByStaffIdService
} from "./shift.service.js";

export const createShift = async (req, res) => {
  try {
    const createdById = req.user?.id || 7;

    let {
      staffIds,
      branchId = null,        // ✅ OPTIONAL NOW
      shiftDate,
      startTime,
      endTime,
      shiftType,
      description
    } = req.body;

    /* REQUIRED VALIDATIONS (branchId REMOVED) */
    if (!staffIds || !shiftDate || !startTime || !endTime || !shiftType) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields"
      });
    }

    /* STAFF IDS */
    if (Array.isArray(staffIds)) {
      staffIds = staffIds.join(",");
    }

    const shift = await createShiftService({
      staffIds,
      branchId,              // ✅ can be null
      shiftDate,
      startTime,
      endTime,
      shiftType,
      description,
      createdById
    });

    return res.status(201).json({
      success: true,
      message: "Shift created successfully!",
      data: shift
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getAllShifts = async (req, res) => { 
  try {
    const adminId = Number(req.params.adminId);

    console.log("ADMIN ID:", adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const shifts = await getAllShiftsService(adminId);

    return res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts,
    });
  } catch (error) {
    console.error("Get shifts error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};




export const getShiftByStaffId = async (req, res, next) => {
  try {
    const { staffId } = req.params;

    const shift = await getShiftByStaffIdService(staffId);

    return res.json({ success: true, data: shift });
  } catch (err) {
    next(err);
  }
};


export const getShiftByShiftId = async (req, res, next) => {
  try {
    const { shiftId } = req.params;

    const shift = await getShiftByShiftIdService(shiftId);

    return res.json({ success: true, data: shift });
  } catch (err) {
    next(err);
  }
};


export const getShiftById = async (req, res) => {
  const shift = await getShiftByIdService(req.params.id);
  return res.json({ success: true, data: shift });
};

export const updateShift = async (req, res) => {
  const updated = await updateShiftService(req.params.id, req.body);
  return res.json({ success: true, message: "Shift updated", data: updated });
};

export const deleteShift = async (req, res) => {
  await deleteShiftService(req.params.id);
  return res.json({ success: true, message: "Shift deleted" });
};

import { sendAppNotification } from "../../utils/notificationHelper.js";

// approve / reject only
export const updateShiftStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status required" });
    }

    const shiftBefore = await getShiftByIdService(id);
    const updated = await updateShiftService(id, { status });

    if (shiftBefore && shiftBefore.createdById) {
      let staffName = "Staff";
      if (req.user && req.user.fullName) {
        staffName = req.user.fullName;
      }
      
      const msg = `${staffName} has ${status.toLowerCase()} the shift: ${shiftBefore.shiftType}`;
      await sendAppNotification(shiftBefore.createdById, msg, {
        title: `Shift ${status}`,
        reference_type: "SHIFT",
        reference_id: id
      });
    }

    return res.json({
      success: true,
      message: `Shift ${status} successfully`,
      data: updated
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};