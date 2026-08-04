import { pool } from "../../config/db.js";

export const createHousekeepingCheckIn = (staffId, branchId, notes, checkIn, createdBy) => {
  return pool.query(
    `
    INSERT INTO housekeepingattendance
    (staffId, branchId, attendanceDate, checkIn, status, notes, createdById)
    VALUES (?, ?, CURDATE(), ?, ?, ?, ?)
    `,
    [staffId, branchId, checkIn, "Active", notes || null, createdBy]
  );
};

export const findExistingActiveAttendance = (staffId) => {
  return pool.query(
    `
    SELECT id FROM housekeepingattendance
    WHERE staffId = ? AND DATE(checkIn) = CURDATE() AND checkOut IS NULL
    `,
    [staffId]
  );
};

export const findAttendanceById = (attendanceId) => {
  return pool.query(
    `SELECT checkIn FROM housekeepingattendance WHERE id = ?`,
    [attendanceId]
  );
};

export const updateCheckOut = (attendanceId, checkOut, workHours) => {
  return pool.query(
    `
    UPDATE housekeepingattendance
    SET checkOut = ?, workHours = ?, status = 'Completed'
    WHERE id = ?
    `,
    [checkOut, workHours, attendanceId]
  );
};

export const getTodayHistoryByStaff = (staffId) => {
  return pool.query(
    `
    SELECT id, checkIn, checkOut, status
    FROM housekeepingattendance
    WHERE staffId = ? AND DATE(checkIn) = CURDATE()
    ORDER BY id DESC
    `,
    [staffId]
  );
};
