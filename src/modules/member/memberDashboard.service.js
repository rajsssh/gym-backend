// src/modules/member/memberDashboard.service.js
import { pool } from "../../config/db.js";
import { calculateAttendanceStats } from "../../utils/attendance.util.js";

export const getMemberDashboardService = async (memberId, adminId) => {
  /* 1️⃣ MEMBER */
  const [[member]] = await pool.query(
    `
    SELECT 
      m.id,
      m.fullName,
      m.membershipFrom,
      m.membershipTo,
      mp.name AS planName
    FROM member m
    LEFT JOIN memberplan mp ON mp.id = m.planId
    WHERE m.id = ?
    `,
    [memberId]
  );

  if (!member) throw { status: 404, message: "Member not found" };

  /* MEMBERSHIP STATUS */
  let membershipStatus = "No Plan";
  
  // Check for pending payments first
  const [[pendingPayment]] = await pool.query(
    `SELECT status FROM payment WHERE memberId = ? AND status = 'Pending' ORDER BY id DESC LIMIT 1`,
    [memberId]
  );
  
  if (pendingPayment) {
    membershipStatus = "Pending Approval";
  } else if (member.membershipFrom && member.membershipTo) {
    membershipStatus =
      new Date(member.membershipTo) < new Date()
        ? "Expired"
        : "Active";
  }

  /* 2️⃣ WORKOUT PROGRESS */
  const [attendanceRows] = await pool.query(
    `
    SELECT checkIn
    FROM memberattendance
    WHERE memberId = ?
      AND checkIn >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    `,
    [memberId]
  );

  const today = new Date();
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(today.getDate() - 6);

  // Use the new utility to calculate precise attendance statuses
  // Requires importing calculateAttendanceStats at the top
  const stats = calculateAttendanceStats(member, sixDaysAgo, today, attendanceRows);
  const days = stats.dailyStatuses;

  /* 3️⃣ CLASSES THIS WEEK */
  const [[classesRow]] = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM classschedule
    WHERE adminId = ?
      AND date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND status = 'Active'
    `,
    [adminId]
  );

  /* 4️⃣ NEXT SESSION */
  const [[nextSessionRow]] = await pool.query(
    `
    SELECT id, sessionName, date, time, duration
    FROM session
    WHERE adminId = ?
      AND status = 'Upcoming'
      AND date >= NOW()
    ORDER BY date, time
    LIMIT 1
    `,
    [adminId]
  );

  /* 5️⃣ RECENT PAYMENTS */
  const [payments] = await pool.query(
    `
    SELECT id, invoiceNo, amount, paymentMode, paymentDate, status
    FROM payment
    WHERE memberId = ?
    ORDER BY paymentDate DESC
    LIMIT 5
    `,
    [memberId]
  );

  return {
    member: {
      id: member.id,
      fullName: member.fullName,
      planName: member.planName,
    },
    membership: {
      status: membershipStatus,
      expiresOn: member.membershipTo,
    },
    workoutProgress: {
      period: "week",
      days,
    },
    classesThisWeek: {
      count: classesRow.total,
      message:
        classesRow.total > 0
          ? `${classesRow.total} classes this week`
          : "No classes this week",
    },
    nextSession: nextSessionRow
      ? {
          id: nextSessionRow.id,
          name: nextSessionRow.sessionName,
          date: nextSessionRow.date,
          time: nextSessionRow.time,
          duration: nextSessionRow.duration,
        }
      : null,
  };
};

