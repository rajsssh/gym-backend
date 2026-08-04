import { pool } from "../../config/db.js";

/**************************************
 * MEMBER CHECK-IN
 **************************************/
export const memberCheckInService = async (memberId, branchId) => {
  // Fetch member
  const [[member]] = await pool.query(
    "SELECT * FROM member WHERE id = ?",
    [memberId]
  );

  if (!member) throw { status: 404, message: "Member not found" };

  if (!member.membershipFrom || !member.membershipTo)
    throw { status: 400, message: "Membership not assigned" };

  const now = new Date();

  if (now < new Date(member.membershipFrom) || now > new Date(member.membershipTo))
    throw { status: 400, message: "Membership expired or not active" };

  // Prevent double check-in
  const [activeRows] = await pool.query(
    "SELECT * FROM memberAttendance WHERE memberId = ? AND checkOut IS NULL",
    [memberId]
  );

  if (activeRows.length > 0)
    throw { status: 400, message: "Member already checked in" };

  const [result] = await pool.query(
    "INSERT INTO memberAttendance (memberId, branchId, checkIn) VALUES (?, ?, NOW())",
    [memberId, branchId]
  );

  return { id: result.insertId, memberId, branchId, checkIn: new Date(), checkOut: null };
};

/**************************************
 * MEMBER CHECK-OUT
 **************************************/
export const memberCheckOutService = async (memberId) => {
  const [activeRows] = await pool.query(
    "SELECT * FROM memberAttendance WHERE memberId = ? AND checkOut IS NULL",
    [memberId]
  );

  if (activeRows.length === 0)
    throw { status: 400, message: "Member not checked in" };

  const attendanceId = activeRows[0].id;

  await pool.query(
    "UPDATE memberAttendance SET checkOut = NOW() WHERE id = ?",
    [attendanceId]
  );

  return { ...activeRows[0], checkOut: new Date() };
};

/**************************************
 * MEMBER ATTENDANCE LIST
 **************************************/
export const memberAttendanceListService = async (memberId) => {
  const [rows] = await pool.query(
    "SELECT * FROM memberAttendance WHERE memberId = ? ORDER BY id DESC",
    [memberId]
  );
  return rows;
};

/**************************************
 * STAFF CHECK-IN
 **************************************/
export const staffCheckInService = async (staffId, branchId) => {
  const [activeRows] = await pool.query(
    "SELECT * FROM staffattendance WHERE staffId = ? AND checkOut IS NULL",
    [staffId]
  );

  if (activeRows.length > 0)
    throw { status: 400, message: "Staff already checked in" };

  const [result] = await pool.query(
    "INSERT INTO staffattendance (staffId, branchId, checkIn) VALUES (?, ?, NOW())",
    [staffId, branchId]
  );

  return { id: result.insertId, staffId, branchId, checkIn: new Date(), checkOut: null };
};

/**************************************
 * STAFF CHECK-OUT
 **************************************/
export const staffCheckOutService = async (staffId) => {
  const [activeRows] = await pool.query(
    "SELECT * FROM staffattendance WHERE staffId = ? AND checkOut IS NULL",
    [staffId]
  );

  if (activeRows.length === 0)
    throw { status: 400, message: "Staff not checked in" };

  const attendanceId = activeRows[0].id;

  await pool.query(
    "UPDATE staffattendance SET checkOut = NOW() WHERE id = ?",
    [attendanceId]
  );

  // Mark today's shift as Completed since the staff has checked out
  try {
    await pool.query(
      "UPDATE shifts SET status = 'Completed' WHERE staffIds = ? AND shiftDate = CURDATE()",
      [staffId]
    );
  } catch (err) {
    console.error("Error updating shift status:", err);
  }

  return { ...activeRows[0], checkOut: new Date() };
};

/**************************************
 * STAFF ATTENDANCE LIST
 **************************************/
export const staffAttendanceListService = async (staffId) => {
  const [rows] = await pool.query(
    "SELECT * FROM staffattendance WHERE staffId = ? ORDER BY id DESC",
    [staffId]
  );
  return rows;
};
