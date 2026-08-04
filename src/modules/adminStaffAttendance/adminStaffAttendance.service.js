/**************************************
 * CREATE STAFF ATTENDANCE
 **************************************/
// export const createStaffAttendanceService = async (data) => {
//   const {
//     staffId,
//     branchId,
//     date,
//     shiftId,
//     mode,
//     checkInTime,
//     checkOutTime,
//     status,
//     notes,
//   } = data;

//   if (!staffId || !branchId || !date) {
//     throw { status: 400, message: "staffId, branchId, and date are required" };
//   }

//   // Parse date from "06-12-2025" format to "2025-06-12"
//   const dateParts = date.split("-");
//   const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

//   // Parse check-in and check-out datetime
//   let checkIn = null;
//   let checkOut = null;

//   if (checkInTime) {
//     checkIn = new Date(checkInTime);
//   } else {
//     // Default to current time if checkInTime is not provided
//     checkIn = new Date();
//   }

//   if (checkOutTime) {
//     checkOut = new Date(checkOutTime);
//   }

//   // If shiftId is provided, validate it exists
//   let shiftDetails = null;
//   if (shiftId) {
//     const [shiftRows] = await pool.query("SELECT * FROM shifts WHERE id = ?", [
//       shiftId,
//     ]);
//     if (!shiftRows.length) {
//       throw { status: 404, message: "Shift not found" };
//     }

//     shiftDetails = shiftRows[0];

//     // Verify the shift belongs to the same branch
//     if (shiftDetails.branchId !== branchId) {
//       throw { status: 400, message: "Shift does not belong to this branch" };
//     }

//     // Verify the staff is assigned to this shift
//     const staffIds = shiftDetails.staffIds
//       .split(",")
//       .map((id) => parseInt(id.trim()));
//     if (!staffIds.includes(staffId)) {
//       throw { status: 400, message: "Staff is not assigned to this shift" };
//     }
//   }

//   // Create attendance record
//   const [result] = await pool.query(
//     `INSERT INTO staffattendance
//       (staffId, branchId, checkIn, checkOut, mode, status, notes)
//      VALUES (?, ?, ?, ?, ?, ?, ?)`,
//     [
//       staffId,
//       branchId,
//       checkIn,
//       checkOut,
//       mode || "Manual",
//       status || "Present",
//       notes || null,
//     ]
//   );

//   return {
//     message: "Staff attendance created successfully",
//     id: result.insertId,
//     staffId,
//     branchId,
//     date,
//     checkIn,
//     checkOut,
//     mode: mode || "Manual",
//     status: status || "Present",
//     shiftId: shiftId || null,
//     shiftDetails,
//   };
// };

import { pool } from "../../config/db.js";
import { notifyAdminAndStaff } from "../../utils/notificationHelper.js";


/**************************************
 * CREATE STAFF ATTENDANCE
 **************************************/
// export const createStaffAttendanceService = async (data) => {
//   const {
//     staffId,
//     branchId,
//     date,
//     shiftId,
//     mode,
//     checkInTime,
//     checkOutTime,
//     status,
//     notes,
//   } = data;

//   if (!staffId || !branchId || !date) {
//     throw { status: 400, message: "staffId, branchId, and date are required" };
//   }

//   // Parse date from "06-12-2025" format to "2025-06-12"
//   const dateParts = date.split("-");
//   const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

//   // Parse check-in and check-out datetime
//   let checkIn = null;
//   let checkOut = null;

//   if (checkInTime) {
//     checkIn = new Date(checkInTime);
//   } else {
//     // Default to current time if checkInTime is not provided
//     checkIn = new Date();
//   }

//   if (checkOutTime) {
//     checkOut = new Date(checkOutTime);
//   }

//   // If shiftId is provided, validate it exists
//   let shiftDetails = null;
//   if (shiftId) {
//     const [shiftRows] = await pool.query("SELECT * FROM shifts WHERE id = ?", [
//       shiftId,
//     ]);
//     if (!shiftRows.length) {
//       throw { status: 404, message: "Shift not found" };
//     }

//     shiftDetails = shiftRows[0];

//     // Verify the shift belongs to the same branch
//     if (shiftDetails.branchId !== branchId) {
//       throw { status: 400, message: "Shift does not belong to this branch" };
//     }

//     // Verify the staff is assigned to this shift
//     const staffIds = shiftDetails.staffIds
//       .split(",")
//       .map((id) => parseInt(id.trim()));
//     if (!staffIds.includes(staffId)) {
//       throw { status: 400, message: "Staff is not assigned to this shift" };
//     }
//   }

//   // Create attendance record
//   const [result] = await pool.query(
//     `INSERT INTO staffattendance
//       (staffId, branchId, checkIn, checkOut, mode, status, notes)
//      VALUES (?, ?, ?, ?, ?, ?, ?)`,
//     [
//       staffId,
//       branchId,
//       checkIn,
//       checkOut,
//       mode || "Manual",
//       status || "Present",
//       notes || null,
//     ]
//   );

//   return {
//     message: "Staff attendance created successfully",
//     id: result.insertId,
//     staffId,
//     branchId,
//     date,
//     checkIn,
//     checkOut,
//     mode: mode || "Manual",
//     status: status || "Present",
//     shiftId: shiftId || null,
//     shiftDetails,
//   };
// };

export const createStaffAttendanceService = async (data) => {
  const {
    adminId,        // frontend se aa raha (future use / audit)
    staffId,
    shiftId,
    date,           // YYYY-MM-DD
    checkInTime,    // YYYY-MM-DDTHH:mm
    checkOutTime,   // YYYY-MM-DDTHH:mm
    mode,
    status,
    notes,
  } = data;

  /* ---------------- VALIDATIONS ---------------- */

  if (!staffId) {
    throw { status: 400, message: "staffId is required" };
  }

  if (!date) {
    throw { status: 400, message: "date is required" };
  }

  /* ---------------- FETCH STAFF + BRANCH ---------------- */

  const [[staff]] = await pool.query(
    `
    SELECT 
      s.id,
      
      s.userId,
      u.fullName
    FROM staff s
    LEFT JOIN user u ON s.userId = u.id
    WHERE s.id = ?
    `,
    [staffId]
  );

  if (!staff) {
    throw { status: 404, message: "Staff not found" };
  }


  /* ---------------- DATE & TIME HANDLING ---------------- */

  // check-in
  let checkIn = checkInTime
    ? new Date(checkInTime)
    : new Date(`${date}T09:00`);

  // check-out
  let checkOut = checkOutTime ? new Date(checkOutTime) : null;

  // 🌙 Night shift auto-fix (checkout next day)
  if (checkOut && checkOut < checkIn) {
    checkOut.setDate(checkOut.getDate() + 1);
  }

  /* ---------------- INSERT ATTENDANCE ---------------- */

  const [result] = await pool.query(
    `
    INSERT INTO memberattendance
      (staffId, shiftId, checkIn, checkOut, mode, status, notes)
    VALUES ( ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      staffId,
   
      shiftId || null,
      checkIn,
      checkOut,
      mode || "Manual",
      status || "Present",
      notes || null,
    ]
  );

  /* ---------------- FETCH FULL RECORD ---------------- */

  const [[attendance]] = await pool.query(
    `
    SELECT 
      sa.id,
      sa.staffId,
      u.fullName AS staffName,
   
      sa.shiftId,
      sa.checkIn,
      sa.checkOut,
      sa.mode,
      sa.status,
      sa.notes,
      sa.createdAt
    FROM memberattendance sa
    LEFT JOIN staff s ON sa.staffId = s.id
    LEFT JOIN user u ON s.userId = u.id
    WHERE sa.id = ?
    `,
    [result.insertId]
  );

  /* ---------------- NOTIFY ---------------- */
  if (adminId && attendance) {
    const checkInTimeStr = checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await notifyAdminAndStaff(adminId, `Staff ${attendance.staffName} checked in manually at ${checkInTimeStr}.`, {
      title: "Staff Check-In",
      reference_type: "ATTENDANCE"
    });
  }

  /* ---------------- FINAL RESPONSE ---------------- */

  return {
    success: true,
    message: "Staff attendance created successfully",
    data: attendance,
  };
};



/**************************************
 * GET STAFF ATTENDANCE BY ID
 **************************************/
export const getStaffAttendanceByIdService = async (id) => {
  const [attendance] = await pool.query(
    `SELECT sa.*, u.fullName as staffName, b.name as branchName 
     FROM staffattendance sa
     JOIN staff s ON sa.staffId = s.id
     JOIN user u ON s.userId = u.id
     JOIN branch b ON sa.branchId = b.id
     WHERE sa.id = ?`,
    [id]
  );

  if (!attendance.length) {
    throw { status: 404, message: "Attendance record not found" };
  }

  const record = attendance[0];

  // Format date for frontend (MM-DD-YYYY)
  if (record.checkIn) {
    const checkInDate = new Date(record.checkIn);
    record.date = `${checkInDate.getDate().toString().padStart(2, "0")}-${(
      checkInDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${checkInDate.getFullYear()}`;

    // Format time for frontend
    record.checkInTime = `${checkInDate
      .getDate()
      .toString()
      .padStart(2, "0")}-${(checkInDate.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${checkInDate.getFullYear()} ${checkInDate
      .getHours()
      .toString()
      .padStart(2, "0")}:${checkInDate
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }

  if (record.checkOut) {
    const checkOutDate = new Date(record.checkOut);
    record.checkOutTime = `${checkOutDate
      .getDate()
      .toString()
      .padStart(2, "0")}-${(checkOutDate.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${checkOutDate.getFullYear()} ${checkOutDate
      .getHours()
      .toString()
      .padStart(2, "0")}:${checkOutDate
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }

  return record;
};

/**************************************
 * GET STAFF ATTENDANCE BY BRANCH ID
 **************************************/
export const getStaffAttendanceByBranchIdService = async (
  branchId,
  options = {}
) => {
  const { date, limit = 20, offset = 0 } = options;

  let query = `
    SELECT sa.*, u.fullName as staffName, b.name as branchName 
    FROM staffattendance sa
    JOIN staff s ON sa.staffId = s.id
    JOIN user u ON s.userId = u.id
    JOIN branch b ON sa.branchId = b.id
    WHERE sa.branchId = ?
  `;

  const params = [branchId];

  if (date) {
    // Parse date from "06-12-2025" format to "2025-06-12"
    const dateParts = date.split("-");
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    query += " AND DATE(sa.checkIn) = ?";
    params.push(formattedDate);
  }

  query += " ORDER BY sa.checkIn DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [attendance] = await pool.query(query, params);

  // Format dates for frontend
  return attendance.map((record) => {
    if (record.checkIn) {
      const checkInDate = new Date(record.checkIn);
      record.date = `${checkInDate.getDate().toString().padStart(2, "0")}-${(
        checkInDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${checkInDate.getFullYear()}`;
      record.checkInTime = `${checkInDate
        .getDate()
        .toString()
        .padStart(2, "0")}-${(checkInDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${checkInDate.getFullYear()} ${checkInDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${checkInDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    }

    if (record.checkOut) {
      const checkOutDate = new Date(record.checkOut);
      record.checkOutTime = `${checkOutDate
        .getDate()
        .toString()
        .padStart(2, "0")}-${(checkOutDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${checkOutDate.getFullYear()} ${checkOutDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${checkOutDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    }

    return record;
  });
};

/**************************************
 * UPDATE STAFF ATTENDANCE
 **************************************/

export const updateStaffAttendanceService = async (id, data) => {
  const {
    staffId,
    branchId,
    date,
    shiftId,
    mode,
    checkInTime,
    checkOutTime,
    status,
    notes,
  } = data;

  // Check if attendance record exists and get current values
  const [existing] = await pool.query(
    "SELECT * FROM staffattendance WHERE id = ?",
    [id]
  );
  if (!existing.length) {
    throw { status: 404, message: "Attendance record not found" };
  }
  
  const currentRecord = existing[0];

  // Parse check-in and check-out datetime
  let checkIn = currentRecord.checkIn;
  let checkOut = currentRecord.checkOut;

  if (checkInTime) {
    checkIn = new Date(checkInTime);
  }

  if (checkOutTime) {
    checkOut = new Date(checkOutTime);
  }

  // If shiftId is provided, validate it
  let shiftDetails = null;
  if (shiftId) {
    const [shiftRows] = await pool.query("SELECT * FROM shifts WHERE id = ?", [
      shiftId,
    ]);
    if (!shiftRows.length) {
      throw { status: 404, message: "Shift not found" };
    }

    shiftDetails = shiftRows[0];

    // Verify the shift belongs to the same branch
    if (shiftDetails.branchId !== branchId) {
      throw { status: 400, message: "Shift does not belong to this branch" };
    }

    // Verify the staff is assigned to this shift
    const staffIds = shiftDetails.staffIds
      .split(",")
      .map((id) => parseInt(id.trim()));
    if (!staffIds.includes(staffId)) {
      throw { status: 400, message: "Staff is not assigned to this shift" };
    }
  }

  // Update the attendance record - FIXED: Added shiftId to UPDATE statement
  const [result] = await pool.query(
    `UPDATE staffattendance 
     SET staffId = ?, branchId = ?, shiftId = ?, checkIn = ?, checkOut = ?, mode = ?, status = ?, notes = ?
     WHERE id = ?`,
    [
      staffId || currentRecord.staffId,
      branchId || currentRecord.branchId,
      shiftId || currentRecord.shiftId,
      checkIn,
      checkOut,
      mode || currentRecord.mode,
      status || currentRecord.status,
      notes || currentRecord.notes,
      id
    ]
  );

  if (result.affectedRows === 0) {
    throw { status: 500, message: "Failed to update attendance record" };
  }

  // Get the updated record to return complete information
  const updatedRecord = await getStaffAttendanceByIdService(id);
  
  // If shiftId was provided, include shiftDetails in response
  if (shiftId) {
    updatedRecord.shiftDetails = shiftDetails;
  }

  return {
    message: "Staff attendance updated successfully",
    ...updatedRecord
  };
};




/**************************************
 * DELETE STAFF ATTENDANCE
 **************************************/
export const deleteStaffAttendanceService = async (id) => {
  // Check if attendance record exists
  const [existing] = await pool.query(
    "SELECT id FROM staffattendance WHERE id = ?",
    [id]
  );
  if (!existing.length) {
    throw { status: 404, message: "Attendance record not found" };
  }

  // Delete the attendance record
  const [result] = await pool.query(
    "DELETE FROM staffattendance WHERE id = ?",
    [id]
  );

  if (result.affectedRows === 0) {
    throw { status: 500, message: "Failed to delete attendance record" };
  }

  return {
    message: "Staff attendance deleted successfully",
    id,
  };
};

/**************************************
 * GET ALL STAFF ATTENDANCE
 **************************************/
export const getAllStaffAttendanceService = async (options = {}) => {
  const { date, branchId, staffId, limit = 20, offset = 0 } = options;

  let query = `
    SELECT sa.*, u.fullName as staffName, b.name as branchName 
    FROM staffattendance sa
    JOIN staff s ON sa.staffId = s.id
    JOIN user u ON s.userId = u.id
    JOIN branch b ON sa.branchId = b.id
    WHERE 1=1
  `;

  const params = [];

  if (date) {
    // Parse date from "06-12-2025" format to "2025-06-12"
    const dateParts = date.split("-");
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    query += " AND DATE(sa.checkIn) = ?";
    params.push(formattedDate);
  }

  if (branchId) {
    query += " AND sa.branchId = ?";
    params.push(branchId);
  }

  if (staffId) {
    query += " AND sa.staffId = ?";
    params.push(staffId);
  }

  query += " ORDER BY sa.checkIn DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [attendance] = await pool.query(query, params);

  // Format dates for frontend
  return attendance.map((record) => {
    if (record.checkIn) {
      const checkInDate = new Date(record.checkIn);
      record.date = `${checkInDate.getDate().toString().padStart(2, "0")}-${(
        checkInDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${checkInDate.getFullYear()}`;
      record.checkInTime = `${checkInDate
        .getDate()
        .toString()
        .padStart(2, "0")}-${(checkInDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${checkInDate.getFullYear()} ${checkInDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${checkInDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    }

    if (record.checkOut) {
      const checkOutDate = new Date(record.checkOut);
      record.checkOutTime = `${checkOutDate
        .getDate()
        .toString()
        .padStart(2, "0")}-${(checkOutDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${checkOutDate.getFullYear()} ${checkOutDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${checkOutDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    }

    return record;
  });
};
