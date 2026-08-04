import { pool } from "../../config/db.js";

import { sendAppNotification } from "../../utils/notificationHelper.js";

export const createShiftService = async (data) => {
  const {
    staffIds,
    branchId,
    shiftDate,
    startTime,
    endTime,
    shiftType,
    description,
    createdById,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO shifts (staffIds, branchId, shiftDate, startTime, endTime, shiftType, description, status, createdById)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
    [
      staffIds,
      branchId,
      shiftDate,
      startTime,
      endTime,
      shiftType,
      description || null,
      createdById,
    ]
  );

  const [rows] = await pool.query(`SELECT * FROM shifts WHERE id = ?`, [
    result.insertId,
  ]);
  const newShift = rows[0];

  // Notification Logic
  if (staffIds) {
    const idsArray = staffIds.toString().split(",");
    if (idsArray.length > 0) {
      const placeholders = idsArray.map(() => "?").join(",");
      const [staffRows] = await pool.query(`SELECT userId FROM staff WHERE id IN (${placeholders}) OR userId IN (${placeholders})`, [...idsArray, ...idsArray]);
      
      const msg = `New Shift Assigned
Shift Type: ${shiftType}
Date: ${shiftDate}
Time: ${startTime} - ${endTime}`;

      for (let s of staffRows) {
        if (s.userId) {
          await sendAppNotification(s.userId, msg, {
            title: "New Shift Assigned",
            sender_id: createdById,
            reference_type: "SHIFT",
            reference_id: result.insertId
          });
        }
      }
    }
  }

  return newShift;
};
export const getAllShiftsService = async (adminId) => {
  const [rows] = await pool.query(
    `
    SELECT DISTINCT
      s.*,
      st.userId,
      st.gender,
      st.branchId
    FROM shifts s
    LEFT JOIN staff st 
      ON st.id = s.staffIds OR FIND_IN_SET(st.id, s.staffIds)
    WHERE st.adminId = ? OR s.createdById = ? OR s.createdById IN (SELECT userId FROM user WHERE adminId = ?)
    ORDER BY s.id DESC
    `,
    [adminId, adminId, adminId]
  );

  return rows;
};






export const getShiftByShiftIdService = async (shiftId) => {
  const [rows] = await pool.query(
    `SELECT * FROM shifts WHERE id = ?`,
    [shiftId]
  );

  if (rows.length === 0) {
    throw { status: 404, message: "Shift not found" };
  }

  return rows[0];
};


export const getShiftByIdService = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM shifts WHERE id = ?`, [id]);
  return rows[0];
};

export const getShiftByStaffIdService = async (staffId) => {
  // Resolve both staff.id and staff.userId for reliable matching
  const [staffRows] = await pool.query(
    "SELECT id, userId FROM staff WHERE id = ?",
    [staffId]
  );

  const realStaffId = staffRows.length ? staffRows[0].id : staffId;
  const realUserId = staffRows.length ? staffRows[0].userId : staffId;

  // Only return shifts actually assigned to this specific staff member
  const [shifts] = await pool.query(
    `SELECT * FROM shifts 
     WHERE FIND_IN_SET(?, staffIds) 
        OR FIND_IN_SET(?, staffIds)
        OR staffIds = ? 
        OR staffIds = ?
     ORDER BY id DESC`,
    [realStaffId, realUserId, realStaffId, realUserId]
  );

  if (!shifts || shifts.length === 0) {
    return [];
  }

  return shifts;
};




// export const updateShiftService = async (id, data) => {
//   const {
//     staffIds,
//     branchId,
//     shiftDate,
//     startTime,
//     endTime,
//     shiftType,
//     description,
//     status,
//   } = data;
//   await pool.query(
//     `UPDATE shifts SET staffIds=?, branchId=?, shiftDate=?, startTime=?, endTime=?, shiftType=?, description=?, status=? WHERE id=?`,
//     [
//       staffIds,
//       branchId,
//       shiftDate,
//       startTime,
//       endTime,
//       shiftType,
//       description,
//       status,
//       id,
//     ]
//   );
//   const [rows] = await pool.query(`SELECT * FROM shifts WHERE id = ?`, [id]);
//   return rows[0];
// };

export const updateShiftService = async (id, data) => {
  const [existingRows] = await pool.query(
    `SELECT * FROM shifts WHERE id = ?`,
    [id]
  );

  if (existingRows.length === 0) {
    throw { status: 404, message: "Shift not found" };
  }

  const existing = existingRows[0];

  const {
    staffIds,
    branchId,
    shiftDate,
    startTime,
    endTime,
    shiftType,
    description,
    status,
  } = data;

  /* KEEP OLD VALUE IF NOT SENT */
  const finalStaffIds =
    staffIds !== undefined ? staffIds : existing.staffIds;

  const finalBranchId =
    branchId !== undefined ? branchId : existing.branchId;

  const finalShiftDate =
    shiftDate !== undefined ? shiftDate : existing.shiftDate;

  const finalStartTime =
    startTime !== undefined ? startTime : existing.startTime;

  const finalEndTime =
    endTime !== undefined ? endTime : existing.endTime;

  const finalShiftType =
    shiftType !== undefined ? shiftType : existing.shiftType;

  const finalDescription =
    description !== undefined ? description : existing.description;

  const finalStatus =
    status !== undefined ? status : existing.status;

  await pool.query(
    `UPDATE shifts
     SET staffIds = ?,
         branchId = ?,
         shiftDate = ?,
         startTime = ?,
         endTime = ?,
         shiftType = ?,
         description = ?,
         status = ?
     WHERE id = ?`,
    [
      finalStaffIds,
      finalBranchId,
      finalShiftDate,
      finalStartTime,
      finalEndTime,
      finalShiftType,
      finalDescription,
      finalStatus,
      id,
    ]
  );

  const [rows] = await pool.query(
    `SELECT * FROM shifts WHERE id = ?`,
    [id]
  );
  const updatedShift = rows[0];

  // Notification Logic
  if (finalStaffIds) {
    const idsArray = finalStaffIds.toString().split(",");
    if (idsArray.length > 0) {
      const placeholders = idsArray.map(() => "?").join(",");
      const [staffRows] = await pool.query(`SELECT userId FROM staff WHERE id IN (${placeholders}) OR userId IN (${placeholders})`, [...idsArray, ...idsArray]);
      
      const msg = `Shift Updated
Type: ${finalShiftType}
Date: ${finalShiftDate}
Time: ${finalStartTime} - ${finalEndTime}`;

      for (let s of staffRows) {
        if (s.userId) {
          await sendAppNotification(s.userId, msg, {
            title: "Shift Updated",
            sender_id: existing.createdById,
            reference_type: "SHIFT",
            reference_id: id
          });
        }
      }
    }
  }

  return updatedShift;
};

export const deleteShiftService = async (id) => {
  const [existingRows] = await pool.query(`SELECT * FROM shifts WHERE id = ?`, [id]);
  if (existingRows.length > 0) {
    const existing = existingRows[0];
    if (existing.staffIds) {
      const idsArray = existing.staffIds.toString().split(",");
      if (idsArray.length > 0) {
        const placeholders = idsArray.map(() => "?").join(",");
        const [staffRows] = await pool.query(`SELECT userId FROM staff WHERE id IN (${placeholders}) OR userId IN (${placeholders})`, [...idsArray, ...idsArray]);
        
        const msg = `Shift Cancelled
Type: ${existing.shiftType}
Date: ${existing.shiftDate}`;

        for (let s of staffRows) {
          if (s.userId) {
            await sendAppNotification(s.userId, msg, {
              title: "Shift Cancelled",
              sender_id: existing.createdById,
              reference_type: "SHIFT",
              reference_id: id
            });
          }
        }
      }
    }
  }

  await pool.query(`DELETE FROM shifts WHERE id = ?`, [id]);
  return { message: "Shift deleted successfully" };
};
