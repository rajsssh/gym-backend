// src/modules/dashboard/dashboard.service.js
import { pool } from "../../config/db.js";

export const getAdminDashboardService = async (adminId) => {
  // 1) Total active members for this admin
  const [[totalRow]] = await pool.query(
    `SELECT COUNT(*) AS totalMembers
     FROM member
     WHERE adminId = ? AND status = 'Active'`,
    [adminId]
  );
  const totalMembers = totalRow.totalMembers || 0;

  // 2) Today's check-ins from memberattendance
  const [[checkRow]] = await pool.query(
    `SELECT COUNT(*) AS todaysCheckIns
     FROM memberattendance ma
     JOIN member m ON ma.memberId = m.id
     WHERE m.adminId = ?
       AND DATE(ma.checkIn) = CURDATE()`,
    [adminId]
  );
  const todaysCheckIns = checkRow.todaysCheckIns || 0;

  // 3) Earnings overview (last 7 days) – from member.amountPaid
  const [earningRows] = await pool.query(
    `SELECT 
        DATE(membershipFrom) AS date,
        SUM(amountPaid)      AS totalEarnings
     FROM member
     WHERE adminId = ?
       AND membershipFrom >= CURDATE() - INTERVAL 6 DAY
     GROUP BY DATE(membershipFrom)
     ORDER BY date`,
    [adminId]
  );

  const earningsOverview = earningRows.map((r) => ({
    date: r.date,                      // e.g. "2025-12-01"
    total: Number(r.totalEarnings || 0)
  }));

  // 4) Sessions overview (optional) – needs "session" table
  let sessionsOverview = { completed: 0, upcoming: 0, cancelled: 0 };

  try {
    const [sessionRows] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM session
       WHERE adminId = ?
       GROUP BY status`,
      [adminId]
    );

    sessionRows.forEach((row) => {
      const s = (row.status || "").toLowerCase();
      if (s === "completed") sessionsOverview.completed = row.count;
      if (s === "upcoming") sessionsOverview.upcoming = row.count;
      if (s === "cancelled") sessionsOverview.cancelled = row.count;
    });
  } catch (e) {
    // agar session table abhi nahi hai to error ignore kar dena
    sessionsOverview = null;
  }

  // 5) Recent activities – last 5 check-ins
  const [activityRows] = await pool.query(
    `SELECT 
        ma.id,
        ma.memberId,
        m.fullName,
        ma.checkIn,
        ma.status,
        ma.mode,
        ma.notes
     FROM memberattendance ma
     JOIN member m ON ma.memberId = m.id
     WHERE m.adminId = ?
     ORDER BY ma.checkIn DESC
     LIMIT 5`,
    [adminId]
  );

  const recentActivities = activityRows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    memberName: row.fullName,
    time: row.checkIn,
    status: row.status,
    mode: row.mode,
    notes: row.notes,
  }));

  return {
    totalMembers,
    todaysCheckIns,
    earningsOverview,
    sessionsOverview,
    recentActivities,
  };
};
export const getTrainerDashboardService = async (trainerId) => {
  // 0) Find staffId, userId, and adminId for trainerId (which could be userId or staff.id)
  const [staffRows] = await pool.query(
    `SELECT s.id AS staffId, s.userId, s.adminId 
     FROM staff s 
     WHERE s.id = ? OR s.userId = ?`,
    [trainerId, trainerId]
  );

  let realStaffId = trainerId;
  let realUserId = trainerId;
  let adminId = null;

  if (staffRows.length > 0) {
    realStaffId = staffRows[0].staffId;
    realUserId = staffRows[0].userId;
    adminId = staffRows[0].adminId;
  } else {
    const [uRows] = await pool.query(`SELECT adminId FROM user WHERE id = ?`, [trainerId]);
    if (uRows.length) adminId = uRows[0].adminId;
  }

  // 1) Total active members assigned to this trainer (via their plan's trainerId or direct trainerId)
  const [[totalRow]] = await pool.query(
    `SELECT COUNT(DISTINCT m.id) AS totalMembers
     FROM member m
     LEFT JOIN member_plan_assignment mpa ON m.id = mpa.memberId
     LEFT JOIN memberplan p1 ON mpa.planId = p1.id
     LEFT JOIN memberplan p2 ON m.planId = p2.id
     WHERE (p1.trainerId IN (?, ?) OR p2.trainerId IN (?, ?) OR m.trainerId IN (?, ?)) AND m.status = 'Active'`,
    [realStaffId, realUserId, realStaffId, realUserId, realStaffId, realUserId]
  );
  let totalMembers = totalRow?.totalMembers || 0;

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // 'YYYY-MM-DD'

  // 2) Today's check-ins
  const [[checkRow]] = await pool.query(
    `SELECT COUNT(DISTINCT ma.id) AS todaysCheckIns
     FROM memberattendance ma
     JOIN member m ON ma.memberId = m.id
     LEFT JOIN member_plan_assignment mpa ON m.id = mpa.memberId
     LEFT JOIN memberplan p1 ON mpa.planId = p1.id
     LEFT JOIN memberplan p2 ON m.planId = p2.id
     WHERE (p1.trainerId IN (?, ?) OR p2.trainerId IN (?, ?) OR m.trainerId IN (?, ?))
       AND DATE(CONVERT_TZ(ma.checkIn, '+00:00', '+05:30')) = ?`,
    [realStaffId, realUserId, realStaffId, realUserId, realStaffId, realUserId, todayStr]
  );
  let todaysCheckIns = checkRow?.todaysCheckIns || 0;

  // 3) Earnings Overview (last 7 days)
  let earningsOverview = [];
  try {
    const [earningRows] = await pool.query(
      `SELECT 
          DATE(date) AS date,
          SUM(price) AS totalEarnings
       FROM unified_bookings
       WHERE trainerId IN (?, ?)
         AND date >= ? - INTERVAL 6 DAY
       GROUP BY DATE(date)
       ORDER BY date`,
      [realStaffId, realUserId, todayStr]
    );
    earningsOverview = earningRows.map((r) => ({
      date: r.date,
      total: Number(r.totalEarnings || 0)
    }));
  } catch (e) {
    // ignore
  }

  // 4) Sessions Overview
  let sessionsOverview = { completed: 0, upcoming: 0, cancelled: 0 };
  try {
    const [sessionRows] = await pool.query(
      `SELECT bookingStatus as status, COUNT(*) AS count
       FROM unified_bookings
       WHERE trainerId IN (?, ?)
       GROUP BY bookingStatus`,
      [realStaffId, realUserId]
    );

    sessionRows.forEach((row) => {
      const s = (row.status || "").toLowerCase();
      if (s === "completed") sessionsOverview.completed = row.count;
      if (s === "upcoming" || s === "booked") sessionsOverview.upcoming += row.count;
      if (s === "cancelled") sessionsOverview.cancelled = row.count;
    });
  } catch (e) {
    // ignore
  }

  // 5) Recent Activities
  const [activityRows] = await pool.query(
    `SELECT 
        ma.id,
        ma.memberId,
        m.fullName,
        ma.checkIn,
        ma.status,
        ma.mode,
        ma.notes
     FROM memberattendance ma
     JOIN member m ON ma.memberId = m.id
     LEFT JOIN member_plan_assignment mpa ON m.id = mpa.memberId
     LEFT JOIN memberplan p1 ON mpa.planId = p1.id
     LEFT JOIN memberplan p2 ON m.planId = p2.id
     WHERE (p1.trainerId IN (?, ?) OR p2.trainerId IN (?, ?))
     GROUP BY ma.id
     ORDER BY ma.checkIn DESC
     LIMIT 5`,
    [realStaffId, realUserId, realStaffId, realUserId]
  );

  let recentActivities = activityRows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    memberName: row.fullName,
    time: row.checkIn,
    status: row.status,
    mode: row.mode,
    notes: row.notes,
  }));

  return {
    totalMembers,
    todaysCheckIns,
    earningsOverview,
    sessionsOverview,
    recentActivities,
  };
};
// export const getPersonalTrainingPlansByAdminService = async (adminId) => {
//   const [rows] = await pool.query(
//     `
//     SELECT
//       p.id,
//       p.name,
//       p.sessions,
//       p.validityDays,
//       p.price,
//       p.type,
//       COUNT(m.id) AS customersCount
//     FROM memberplan p
//     LEFT JOIN member m
//       ON m.planId = p.id
//       AND m.status = 'ACTIVE'
//       AND m.adminId = ?        -- yahi se "by admin" wala count aa raha hai
//     GROUP BY p.id
//     HAVING p.sessions IS NOT NULL AND p.sessions > 0   -- sirf training plans
//     ORDER BY p.id DESC
//     `,
//     [adminId]
//   );

//   return rows;
// };


export const getPersonalTrainingPlansByAdminService = async (adminId) => {
  const [rows] = await pool.query(
    `
    SELECT * FROM memberplan  WHERE adminId = ? `,
    [adminId]
  );

  return rows;
};

export const getPersonalTrainingCustomersByAdminService = async (adminId, planId) => {
  try {
    /* =========================
       1️⃣ FETCH PLAN (VALIDATION)
    ========================= */
    const planQuery = `
      SELECT 
        mp.id,
        mp.name,
        mp.sessions,
        mp.validityDays,
        mp.price,
        mp.type,
        mp.trainerType
      FROM memberplan mp
      WHERE 
        mp.id = ?
        AND mp.type = 'MEMBER'
        AND mp.trainerType = 'personal'
    `;

    const [planResult] = await pool.query(planQuery, [planId]);

    if (!planResult.length) {
      const error = new Error("Membership plan for personal training not found");
      error.statusCode = 404;
      throw error;
    }

    const plan = planResult[0];

    /* =========================
       2️⃣ FETCH MEMBERS
    ========================= */
    const membersQuery = `
      SELECT 
        m.id,
        m.userId,
        m.fullName,
        m.email,
        m.phone,
        m.gender,
        m.address,
        m.joinDate,
        m.branchId,
        m.membershipFrom,
        m.membershipTo,
        m.paymentMode,
        m.amountPaid,
        m.dateOfBirth,
        m.status,
        m.planId
      FROM member m
      WHERE 
        m.adminId = ?
        AND m.planId = ?
      ORDER BY m.fullName
    `;

    const [members] = await pool.query(membersQuery, [adminId, planId]);

    /* =========================
       3️⃣ SESSION CALCULATION
       (PT + CLASS BOTH)
    ========================= */
    for (const member of members) {

      /* 🔹 PT SESSIONS (Completed only) */
      const [[ptRow]] = await pool.query(
        `
        SELECT COUNT(*) AS ptUsedSessions
        FROM unified_bookings
        WHERE memberId = ?
          AND bookingType = 'PT'
          AND bookingStatus = 'Completed'
        `,
        [member.id]
      );

      const ptUsedSessions = ptRow?.ptUsedSessions || 0;

      /* 🔹 CLASS BOOKINGS (consume sessions) */
      const [[classRow]] = await pool.query(
        `
        SELECT COUNT(*) AS classBookings
        FROM booking
        WHERE memberId = ?
        `,
        [member.id]
      );

      const classBookings = classRow?.classBookings || 0;

      /* 🔹 FINAL SESSION LOGIC */
      const totalSessions = plan.sessions;
      const usedSessions = ptUsedSessions + classBookings;
      const remainingSessions = Math.max(totalSessions - usedSessions, 0);

      member.sessionInfo = {
        totalSessions,
        usedSessions,
        remainingSessions,
        renewRequired: remainingSessions === 0
      };

      member.classInfo = {
        totalClassesBooked: classBookings
      };
    }

    /* =========================
       4️⃣ STATISTICS
    ========================= */
    let active = 0;
    let completed = 0;

    members.forEach(member => {
      if (member.sessionInfo.remainingSessions > 0) {
        active++;
      } else {
        completed++;
      }
    });

    /* =========================
       5️⃣ FINAL RESPONSE
    ========================= */
    return {
      plan,
      members,
      statistics: {
        active,
        completed,
        totalMembers: members.length
      }
    };

  } catch (error) {
    throw error;
  }
};

