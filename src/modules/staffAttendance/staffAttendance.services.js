// import { pool } from "../../config/db.js";

// /**
//  * Helper: Get admin user by id
//  */
// const getAdminById = async (adminUserId) => {
//   const id = Number(adminUserId);

//   // yaha NaN / missing adminId handle kar liya
//   if (!adminUserId || Number.isNaN(id)) {
//     throw { status: 403, message: "Unauthorized: invalid admin id" };
//   }

//   const [rows] = await pool.query(
//     "SELECT * FROM User WHERE id = ?",
//     [id]
//   );
//   return rows[0] || null;
// };

// /**
//  * Helper: Get staff by id
//  */
// const getStaffById = async (staffId) => {
//   const [rows] = await pool.query(
//     "SELECT * FROM Staff WHERE id = ?",
//     [Number(staffId)]
//   );
//   return rows[0] || null;
// };

// /**
//  * Helper: Get attendance row + staff + createdBy (Prisma include jaisa)
//  */
// const getAttendanceWithRelations = async (id) => {
//   const [rows] = await pool.query(
//     "SELECT * FROM StaffAttendance WHERE id = ?",
//     [Number(id)]
//   );
//   if (!rows.length) return null;

//   const attendance = rows[0];

//   let staff = null;
//   let createdBy = null;

//   if (attendance.staffId) {
//     const [sRows] = await pool.query(
//       "SELECT * FROM Staff WHERE id = ?",
//       [attendance.staffId]
//     );
//     staff = sRows[0] || null;
//   }

//   if (attendance.createdById) {
//     const [uRows] = await pool.query(
//       "SELECT * FROM User WHERE id = ?",
//       [attendance.createdById]
//     );
//     createdBy = uRows[0] || null;
//   }

//   return { ...attendance, staff, createdBy };
// };

// /**************************************
//  * CREATE STAFF ATTENDANCE
//  **************************************/
// export const createStaffAttendanceService = async (adminUserId, dto) => {
//   const admin = await getAdminById(adminUserId);
//   if (!admin) throw { status: 403, message: "Unauthorized" };

//   const staff = await getStaffById(dto.staffId);
//   if (!staff) throw { status: 400, message: "Staff not found" };

//   // ✅ Branch check – same as Prisma
//   if (admin.branchId && admin.branchId !== staff.branchId) {
//     throw {
//       status: 403,
//       message: "You cannot add attendance for staff of another branch",
//     };
//   }

//   // Date ko 00:00:00 pe normalize
//   const date = new Date(dto.date);
//   date.setHours(0, 0, 0, 0);

//   const checkinTime = dto.checkinTime ? new Date(dto.checkinTime) : null;
//   const checkoutTime = dto.checkoutTime ? new Date(dto.checkoutTime) : null;

//   const mode = dto.mode || "Manual";
//   const shiftId = dto.shiftId || null;
//   const shiftName = dto.shiftName || null;
//   const status = dto.status;
//   const notes = dto.notes || null;

//   const [result] = await pool.query(
//     `INSERT INTO StaffAttendance
//       (staffId, date, checkinTime, checkoutTime, mode, shiftId, shiftName, status, notes, createdById)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       Number(dto.staffId),
//       date,
//       checkinTime,
//       checkoutTime,
//       mode,
//       shiftId,
//       shiftName,
//       status,
//       notes,
//       Number(adminUserId),
//     ]
//   );

//   const record = await getAttendanceWithRelations(result.insertId);
//   return record;
// };

// /**************************************
//  * LIST STAFF ATTENDANCE (with filters)
//  **************************************/
// export const listStaffAttendanceService = async (adminUserId, filters = {}) => {
//   const admin = await getAdminById(adminUserId);
//   if (!admin) throw { status: 403, message: "Unauthorized" };

//   let sql = "SELECT * FROM StaffAttendance WHERE 1=1";
//   const params = [];

//   // Branch filter (admin.branchId ke hisaab se)
//   if (admin.branchId) {
//     sql += " AND staffId IN (SELECT id FROM Staff WHERE branchId = ?)";
//     params.push(admin.branchId);
//   }

//   // Staff filter
//   if (filters.staffId) {
//     sql += " AND staffId = ?";
//     params.push(Number(filters.staffId));
//   }

//   // Status filter
//   if (filters.status) {
//     sql += " AND status = ?";
//     params.push(filters.status);
//   }

//   // Date range filter
//   if (filters.from || filters.to) {
//     if (filters.from) {
//       const from = new Date(filters.from);
//       from.setHours(0, 0, 0, 0);
//       sql += " AND date >= ?";
//       params.push(from);
//     }

//     if (filters.to) {
//       const to = new Date(filters.to);
//       to.setHours(23, 59, 59, 999);
//       sql += " AND date <= ?";
//       params.push(to);
//     }
//   }

//   sql += " ORDER BY date DESC";

//   const [rows] = await pool.query(sql, params);

//   if (!rows.length) return [];

//   const staffIds = [
//     ...new Set(rows.map((r) => r.staffId).filter((v) => v != null)),
//   ];
//   const createdByIds = [
//     ...new Set(rows.map((r) => r.createdById).filter((v) => v != null)),
//   ];

//   let staffMap = {};
//   let createdByMap = {};

//   if (staffIds.length) {
//     const placeholders = staffIds.map(() => "?").join(",");
//     const [staffRows] = await pool.query(
//       `SELECT * FROM Staff WHERE id IN (${placeholders})`,
//       staffIds
//     );
//     staffMap = Object.fromEntries(staffRows.map((s) => [s.id, s]));
//   }

//   if (createdByIds.length) {
//     const placeholders = createdByIds.map(() => "?").join(",");
//     const [userRows] = await pool.query(
//       `SELECT * FROM User WHERE id IN (${placeholders})`,
//       createdByIds
//     );
//     createdByMap = Object.fromEntries(userRows.map((u) => [u.id, u]));
//   }

//   return rows.map((r) => ({
//     ...r,
//     staff: staffMap[r.staffId] || null,
//     createdBy: createdByMap[r.createdById] || null,
//   }));
// };

// /**************************************
//  * GET BY ID
//  **************************************/
// export const getStaffAttendanceByIdService = async (adminUserId, id) => {
//   const admin = await getAdminById(adminUserId);
//   if (!admin) throw { status: 403, message: "Unauthorized" };

//   const [rows] = await pool.query(
//     "SELECT * FROM StaffAttendance WHERE id = ?",
//     [Number(id)]
//   );

//   if (!rows.length) throw { status: 404, message: "Attendance not found" };

//   const attendance = rows[0];

//   const staff = await getStaffById(attendance.staffId);
//   if (!staff) throw { status: 400, message: "Staff not found" };

//   if (admin.branchId && staff.branchId !== admin.branchId) {
//     throw { status: 403, message: "Forbidden" };
//   }

//   let createdBy = null;
//   if (attendance.createdById) {
//     const [uRows] = await pool.query(
//       "SELECT * FROM User WHERE id = ?",
//       [attendance.createdById]
//     );
//     createdBy = uRows[0] || null;
//   }

//   return { ...attendance, staff, createdBy };
// };

// /**************************************
//  * UPDATE ATTENDANCE
//  **************************************/
// export const updateStaffAttendanceService = async (adminUserId, id, dto) => {
//   const admin = await getAdminById(adminUserId);
//   if (!admin) throw { status: 403, message: "Unauthorized" };

//   const [rows] = await pool.query(
//     "SELECT * FROM StaffAttendance WHERE id = ?",
//     [Number(id)]
//   );
//   if (!rows.length) throw { status: 404, message: "Not found" };

//   const existing = rows[0];

//   const staff = await getStaffById(existing.staffId);
//   if (!staff) throw { status: 400, message: "Staff not found" };

//   if (admin.branchId && staff.branchId !== admin.branchId) {
//     throw { status: 403, message: "Forbidden" };
//   }

//   let staffId = existing.staffId;
//   if (dto.staffId) {
//     staffId = dto.staffId;
//   }

//   let date = existing.date;
//   if (dto.date) {
//     const d = new Date(dto.date);
//     d.setHours(0, 0, 0, 0);
//     date = d;
//   }

//   let checkinTime = existing.checkinTime;
//   if ("checkinTime" in dto) {
//     checkinTime = dto.checkinTime ? new Date(dto.checkinTime) : null;
//   }

//   let checkoutTime = existing.checkoutTime;
//   if ("checkoutTime" in dto) {
//     checkoutTime = dto.checkoutTime ? new Date(dto.checkoutTime) : null;
//   }

//   const mode = dto.mode !== undefined ? dto.mode : existing.mode;
//   const shiftId = dto.shiftId !== undefined ? dto.shiftId : existing.shiftId;
//   const shiftName =
//     dto.shiftName !== undefined ? dto.shiftName : existing.shiftName;
//   const status = dto.status !== undefined ? dto.status : existing.status;
//   const notes = dto.notes !== undefined ? dto.notes : existing.notes;

//   await pool.query(
//     `UPDATE StaffAttendance
//      SET staffId = ?, date = ?, checkinTime = ?, checkoutTime = ?, mode = ?,
//          shiftId = ?, shiftName = ?, status = ?, notes = ?
//      WHERE id = ?`,
//     [
//       Number(staffId),
//       date,
//       checkinTime,
//       checkoutTime,
//       mode,
//       shiftId,
//       shiftName,
//       status,
//       notes,
//       Number(id),
//     ]
//   );

//   const updated = await getAttendanceWithRelations(id);
//   return updated;
// };

// /**************************************
//  * DELETE ATTENDANCE
//  **************************************/
// export const deleteStaffAttendanceService = async (adminUserId, id) => {
//   const admin = await getAdminById(adminUserId);
//   if (!admin) throw { status: 403, message: "Unauthorized" };

//   const [rows] = await pool.query(
//     "SELECT * FROM StaffAttendance WHERE id = ?",
//     [Number(id)]
//   );
//   if (!rows.length) throw { status: 404, message: "Not found" };

//   const record = rows[0];

//   const staff = await getStaffById(record.staffId);
//   if (!staff) throw { status: 400, message: "Staff not found" };

//   if (admin.branchId && staff.branchId !== admin.branchId) {
//     throw { status: 403, message: "Forbidden" };
//   }

//   await pool.query(
//     "DELETE FROM StaffAttendance WHERE id = ?",
//     [Number(id)]
//   );

//   return { success: true };
// };

// /**************************************
//  * DEFAULT SERVICE OBJECT (for controller)
//  **************************************/
// const AttendanceService = {
//   create: createStaffAttendanceService,
//   list: listStaffAttendanceService,
//   getById: getStaffAttendanceByIdService,
//   update: updateStaffAttendanceService,
//   delete: deleteStaffAttendanceService,
// };

// export default AttendanceService;
  