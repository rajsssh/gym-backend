import { pool } from "../../config/db.js";
import { calculateAttendanceStats } from "../../utils/attendance.util.js";

export const getAlerts = async (req, res, next) => {
  try {
    let sql = `SELECT * FROM alert`;
    const params = [];

    if (req.user.role !== "Superadmin") {
      sql += ` WHERE branchId = ?`;
      params.push(req.user.branchId);
    }

    sql += ` ORDER BY id DESC LIMIT 50`;

    const [alerts] = await pool.query(sql, params);

    res.json({ success: true, alerts });
  } catch (err) {
    console.error("Error fetching alerts:", err);
    next({ status: 500, message: "Failed to fetch alerts" });
  }
};

export const getVulnerableMembers = async (req, res, next) => {
  try {
    const userRole = (req.user && req.user.role || "").toUpperCase();
    const isSuper = userRole === "SUPERADMIN";
    const isAdmin = userRole === "ADMIN";

    const adminId = isSuper ? null : (isAdmin ? req.user?.id : req.user?.adminId);
    const branchId = isSuper ? null : req.user?.branchId;
    
    let sql = `
      SELECT m.id, m.fullName, m.email, m.phone, m.branchId, m.profileImage, m.membershipFrom, m.membershipTo,
             (SELECT MAX(checkIn) FROM memberattendance WHERE memberId = m.id) as lastCheckIn
      FROM member m
      WHERE UPPER(m.status) = 'ACTIVE'
    `;
    
    const params = [];
    
    if (adminId && adminId !== 0) {
      sql += ` AND (m.adminId = ? OR m.adminId IS NULL OR m.adminId = 0)`;
      params.push(adminId);
    }
    
    if (branchId && branchId !== 0) {
      sql += ` AND (m.branchId = ? OR m.branchId IS NULL OR m.branchId = 0)`;
      params.push(branchId);
    }
    
    const [rows] = await pool.query(sql, params);

    const memberIds = rows.map(m => m.id);
    let attendances = [];
    if (memberIds.length > 0) {
      const [attRows] = await pool.query(`
        SELECT memberId, checkIn 
        FROM memberattendance 
        WHERE checkIn >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
        AND memberId IN (?)
      `, [memberIds]);
      attendances = attRows;
    }

    const attByMember = {};
    attendances.forEach(a => {
      if (!attByMember[a.memberId]) attByMember[a.memberId] = [];
      attByMember[a.memberId].push(a);
    });

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const members = rows.map(m => {
      let daysAbsent = 16; // default if never checked in
      if (m.lastCheckIn) {
        const diffTime = Math.abs(today - new Date(m.lastCheckIn));
        daysAbsent = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const memberAttendances = attByMember[m.id] || [];
      const stats = calculateAttendanceStats(m, thirtyDaysAgo, today, memberAttendances);

      let badge = 'Green';
      // Red: < 40% attendance or absent for 15+ days
      if (stats.attendancePercentage < 40 || daysAbsent >= 15) {
        badge = 'Red';
      } 
      // Yellow: 40-75% attendance or absent for 7+ days
      else if (stats.attendancePercentage <= 75 || daysAbsent >= 7) {
        badge = 'Yellow';
      }
      // Blue: < 90% attendance or absent for 3+ days
      else if (stats.attendancePercentage < 90 || daysAbsent >= 3) {
        badge = 'Blue';
      }

      return { 
        ...m, 
        attendancePercentage: stats.attendancePercentage,
        totalApplicableDays: stats.totalApplicableDays,
        presentDays: stats.presentDays,
        absentDays: stats.absentDays,
        daysAbsent,
        badge 
      };
    });

    res.json({ success: true, members });
  } catch (err) {
    console.error("Error fetching vulnerable members:", err);
    next({ status: 500, message: "Failed to fetch vulnerable members" });
  }
};
