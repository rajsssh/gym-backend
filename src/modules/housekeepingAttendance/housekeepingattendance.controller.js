import {
  createHousekeepingCheckIn,
  findExistingActiveAttendance,
  findAttendanceById,
  updateCheckOut,
  getTodayHistoryByStaff,
} from "./housekeepingattendance.service.js";

/* --------------------- CHECK-IN --------------------- */
export const housekeepingCheckIn = async (req, res) => {
  try {
    const { staffId, branchId, notes, checkIn } = req.body;

    if (!staffId || !branchId)
      return res
        .status(400)
        .json({ success: false, message: "staffId & branchId required" });

    const time = checkIn ? new Date(checkIn) : new Date();

    const [existing] = await findExistingActiveAttendance(staffId);
    if (existing.length > 0)
      return res
        .status(400)
        .json({ success: false, message: "Already checked-in" });

    await createHousekeepingCheckIn(
      staffId,
      branchId,
      notes,
      time,
      req.user?.id || 3
    );

    res.json({ success: true, message: "Check-in successful" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* --------------------- CHECK-OUT --------------------- */
export const housekeepingCheckOut = async (req, res) => {
  try {
    const attendanceId = req.params.id;

    const [rows] = await findAttendanceById(attendanceId);
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });

    const checkIn = new Date(rows[0].checkIn);
    const checkOut = new Date();
    const workHours = (Math.abs(checkOut - checkIn) / 36e5).toFixed(2);

    await updateCheckOut(attendanceId, checkOut, workHours);

    res.json({
      success: true,
      message: "Checkout successful",
      checkOut,
      workHours,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* --------------------- HISTORY LIST --------------------- */
export const housekeepingHistory = async (req, res) => {
  try {
    const staffId = req.params.staffId;

    const [rows] = await getTodayHistoryByStaff(staffId);

    res.json({
      success: true,
      history: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
