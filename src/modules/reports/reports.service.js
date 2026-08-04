import { pool } from "../../config/db.js";

// Generate Member Report Service
export const generateMemberReportService = async (adminId, fromDate, toDate, status) => {
  try {
    let dateClausePayment = '';
    let dateClauseBooking = '';

    if (fromDate && toDate) {
      if (fromDate === toDate) {
        // If single date selected, show month-to-date up to selected date for full visibility
        const monthStart = fromDate.substring(0, 7) + '-01';
        dateClausePayment = `AND DATE(p.paymentDate) BETWEEN '${monthStart}' AND '${toDate}'`;
        dateClauseBooking = `AND (DATE(ub.createdAt) BETWEEN '${monthStart}' AND '${toDate}' OR DATE(ub.date) BETWEEN '${monthStart}' AND '${toDate}')`;
      } else {
        dateClausePayment = `AND DATE(p.paymentDate) BETWEEN '${fromDate}' AND '${toDate}'`;
        dateClauseBooking = `AND (DATE(ub.createdAt) BETWEEN '${fromDate}' AND '${toDate}' OR DATE(ub.date) BETWEEN '${fromDate}' AND '${toDate}')`;
      }
    }

    const statusClause = status && status !== 'All'
      ? `AND ub.bookingStatus = '${status}'`
      : '';

    // 1️⃣ Payments Revenue
    const [paymentStats] = await pool.query(
      `SELECT 
        COUNT(*) AS totalPayments,
        COALESCE(SUM(p.amount), 0) AS totalPaymentRevenue
       FROM payment p
       INNER JOIN member m ON p.memberId = m.id
       WHERE m.adminId = ? ${dateClausePayment}`,
      [adminId]
    );

    // 2️⃣ Booking statistics from unified_bookings table
    const [bookingStats] = await pool.query(
      `SELECT 
        COUNT(*) AS totalBookings,
        COALESCE(SUM(ub.price), 0) AS totalBookingRevenue,
        AVG(ub.price) AS avgTicket,
        SUM(CASE WHEN ub.bookingStatus = 'Completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN ub.bookingStatus = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN ub.bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN ub.bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
      FROM unified_bookings ub
      INNER JOIN member m ON ub.memberId = m.id
      WHERE m.adminId = ? ${dateClauseBooking} ${statusClause}`,
      [adminId]
    );

    // 3️⃣ Bookings & Payments by day
    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(ub.createdAt) AS date,
        COUNT(*) AS count,
        SUM(ub.price) AS revenue
      FROM unified_bookings ub
      INNER JOIN member m ON ub.memberId = m.id
      WHERE m.adminId = ? ${dateClauseBooking} ${statusClause}
      GROUP BY DATE(ub.createdAt)
      ORDER BY date ASC`,
      [adminId]
    );

    // 4️⃣ Booking status distribution
    const [bookingStatusRows] = await pool.query(
      `SELECT 
        ub.bookingStatus,
        COUNT(*) AS count
      FROM unified_bookings ub
      INNER JOIN member m ON ub.memberId = m.id
      WHERE m.adminId = ? ${dateClauseBooking}
      GROUP BY ub.bookingStatus`,
      [adminId]
    );

    // 5️⃣ Unified Recent Transactions (Payments + Bookings)
    const [transactions] = await pool.query(
      `(
        SELECT 
          DATE_FORMAT(p.paymentDate, '%Y-%m-%d') as date,
          'System' as trainer,
          m.fullName as username,
          'Membership Plan Payment' as type,
          DATE_FORMAT(p.paymentDate, '%H:%i:%s') as time,
          'Completed' as status,
          p.amount as price,
          p.paymentDate as rawTime
        FROM payment p
        LEFT JOIN member m ON p.memberId = m.id
        WHERE m.adminId = ? ${dateClausePayment}
      )
      UNION ALL
      (
        SELECT 
          DATE_FORMAT(ub.date, '%Y-%m-%d') as date,
          COALESCE(u.fullName, 'N/A') as trainer,
          m.fullName as username,
          CASE 
            WHEN ub.bookingType = 'PT' THEN 'Personal Training' 
            WHEN ub.bookingType = 'GROUP' THEN 'Group Class' 
            ELSE COALESCE(ub.bookingType, 'Booking')
          END as type,
          COALESCE(ub.startTime, '00:00:00') as time,
          ub.bookingStatus as status,
          ub.price as price,
          ub.createdAt as rawTime
        FROM unified_bookings ub
        LEFT JOIN member m ON ub.memberId = m.id
        LEFT JOIN user u ON ub.trainerId = u.id
        WHERE m.adminId = ? ${dateClauseBooking} ${statusClause}
      )
      ORDER BY rawTime DESC
      LIMIT 100`,
      [adminId, adminId]
    );

    const totalRevenueSum = Number(paymentStats[0]?.totalPaymentRevenue || 0) + Number(bookingStats[0]?.totalBookingRevenue || 0);
    const totalCountSum = Number(paymentStats[0]?.totalPayments || 0) + Number(bookingStats[0]?.totalBookings || 0);

    const formattedStats = {
      totalBookings: totalCountSum,
      totalRevenue: totalRevenueSum,
      avgTicket: totalCountSum > 0 ? (totalRevenueSum / totalCountSum).toFixed(2) : 0,
      completed: (Number(bookingStats[0]?.completed || 0) + Number(paymentStats[0]?.totalPayments || 0)),
      confirmed: Number(bookingStats[0]?.confirmed || 0),
      cancelled: Number(bookingStats[0]?.cancelled || 0),
      booked: Number(bookingStats[0]?.booked || 0),
    };

    const formattedTransactions = transactions.map((t) => ({
      date: t.date,
      trainer: t.trainer || 'N/A',
      username: t.username || 'N/A',
      type: t.type,
      time: t.time,
      status: t.status,
      price: Number(t.price || 0),
    }));

    return {
      stats: formattedStats,
      bookingsByDay,
      bookingStatus: bookingStatusRows,
      transactions: formattedTransactions,
    };
  } catch (error) {
    throw new Error(`Error generating member report: ${error.message}`);
  }
};

export const generateGeneralTrainerReportService = async (adminId, fromDate, toDate, status) => {
  try {
    const dateClause = fromDate && toDate
      ? `AND DATE(ub.createdAt) BETWEEN '${fromDate}' AND '${toDate}'`
      : '';
    const statusClause = status && status !== 'All'
      ? `AND ub.bookingStatus = '${status}'`
      : '';

    // 2️⃣ Get member userIds related to this admin
    const [members] = await pool.query(
      `SELECT userId FROM member WHERE adminId = ?`,
      [adminId]
    );

    if (members.length === 0) {
      return {
        stats: {
          totalBookings: 0,
          completed: 0,
          cancelled: 0,
          booked: 0,
        },
        bookingsByDay: [],
        bookingStatus: [],
        transactions: [],
      };
    }

    // Extract user IDs of members
    const memberIds = members.map((m) => m.userId); // Using userId from the member table

    const memberPlaceholders = memberIds.map(() => "?").join(",");

    // 3️⃣ Get booking statistics for GROUP bookings for these members
    const [bookingStats] = await pool.query(
      `SELECT 
    COUNT(*) AS totalBookings,
    0 AS totalRevenue,
    0 AS avgTicket,
    SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
    SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) AS booked
  FROM unified_bookings ub
  LEFT JOIN member m ON ub.memberId = m.id  -- This join ensures we link the correct member.id from unified_bookings
  WHERE m.adminId = ? ${dateClause} ${statusClause} -- Filtering by adminId to ensure we're only pulling bookings for this admin
    AND ub.bookingType = 'GROUP'`, // Only group bookings
      [adminId]
    );

    // 4️⃣ Bookings by day
    const [bookingsByDay] = await pool.query(
      `SELECT 
    DATE(ub.createdAt) AS date,
    COUNT(*) AS count
  FROM unified_bookings ub
  LEFT JOIN member m ON ub.memberId = m.id  -- Ensuring the correct join for memberId
  WHERE m.adminId = ? ${dateClause} ${statusClause}
    AND ub.bookingType = 'GROUP'  -- Only group bookings
  GROUP BY DATE(ub.createdAt)
  ORDER BY date ASC`,
      [adminId]
    );

    // 5️⃣ Booking status distribution
    const [bookingStatus] = await pool.query(
      `SELECT 
    ub.bookingStatus,
    COUNT(*) AS count
  FROM unified_bookings ub
  LEFT JOIN member m ON ub.memberId = m.id  -- Correctly joining with member.id
  WHERE m.adminId = ? ${dateClause}
    AND ub.bookingType = 'GROUP'  -- Only group bookings
  GROUP BY ub.bookingStatus`,
      [adminId]
    );

    // 6️⃣ Transactions list for UI
    const [transactions] = await pool.query(
      `SELECT 
    ub.date,
    IFNULL(trainerUser.fullName, 'N/A') AS trainerName,
    IFNULL(memberUser.fullName, 'N/A') AS memberName,
    'Group Training' AS type,
    ub.startTime AS time,
    IFNULL(ub.bookingStatus, 'N/A') AS status
  FROM unified_bookings ub
  LEFT JOIN user AS trainerUser ON ub.trainerId = trainerUser.id
  LEFT JOIN member AS m ON ub.memberId = m.id  -- Linking unified_bookings with member using member.id
  LEFT JOIN user AS memberUser ON m.userId = memberUser.id  -- Linking member to user via userId
  WHERE m.adminId = ? ${dateClause} ${statusClause}
    AND ub.bookingType = 'GROUP'  -- Only group bookings
  ORDER BY ub.date DESC`,
      [adminId]
    );
    // Format summary stats
    const formattedStats = {
      totalBookings: bookingStats[0].totalBookings || 0,
      completed: bookingStats[0].completed || 0,
      cancelled: bookingStats[0].cancelled || 0,
      booked: bookingStats[0].booked || 0,
    };

    // Format transaction list
    const formattedTransactions = transactions.map((tx) => ({
      date: tx.date,
      trainer: tx.trainerName || "N/A",
      username: tx.memberName || "N/A",
      type: tx.type,
      time: tx.time,
      status: tx.status,
    }));

    return {
      stats: formattedStats,
      bookingsByDay,
      bookingStatus,
      transactions: formattedTransactions,
    };
  } catch (error) {
    throw new Error(
      `Error generating general trainer report: ${error.message}`
    );
  }
};

// export const generatePersonalTrainerReportService = async (adminId) => {

//   try {
//     const [stats] = await pool.query(
//       `SELECT
//         COUNT(*) as totalBookings,
//         0 as totalRevenue,
//         0 as avgTicket,
//         SUM(CASE WHEN bookingStatus = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
//         SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
//         SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
//       FROM unified_bookings ub
//       JOIN branch b ON ub.branchId = b.id
//       WHERE b.adminId = ? AND ub.bookingType = 'PT'`,
//       [adminId]
//     );

//     const [bookingsByDay] = await pool.query(
//       `SELECT
//         DATE(ub.date) AS date,
//         COUNT(*) AS count,
//         0 AS revenue
//       FROM unified_bookings ub
//       JOIN branch b ON ub.branchId = b.id
//       WHERE b.adminId = ? AND ub.bookingType = 'PT'
//       GROUP BY DATE(ub.date)
//       ORDER BY date ASC`,
//       [adminId]
//     );

//     const [bookingStatus] = await pool.query(
//       `SELECT bookingStatus, COUNT(*) as count
//        FROM unified_bookings ub
//        JOIN branch b ON ub.branchId = b.id
//        WHERE b.adminId = ? AND ub.bookingType = 'PT'
//        GROUP BY bookingStatus`,
//       [adminId]
//     );

//     const [transactions] = await pool.query(
//       `SELECT
//         ub.date,
//         u.fullName AS trainer,
//         m.fullName AS username,
//         'Personal Training' AS type,
//         CONCAT(ub.startTime, ' - ', ub.endTime) AS time,
//         0 AS revenue,
//         ub.bookingStatus AS status
//       FROM unified_bookings ub
//       LEFT JOIN staff s ON ub.trainerId = s.id
//       LEFT JOIN user u ON s.userId = u.id
//       LEFT JOIN member m ON ub.memberId = m.id
//       JOIN branch b ON ub.branchId = b.id
//       WHERE b.adminId = ? AND ub.bookingType = 'PT'
//       ORDER BY ub.date DESC`,
//       [adminId]
//     );

//     return {
//       stats: stats[0],
//       bookingsByDay,
//       bookingStatus,
//       transactions
//     };

//   } catch (error) {
//     throw new Error("PT Report Error: " + error.message);
//   }
// };

export const generatePersonalTrainerReportService = async (adminId) => {
  try {
    const [members] = await pool.query(
      `SELECT id FROM member WHERE adminId = ?`,
      [adminId]
    );

    if (members.length === 0) {
      return {
        stats: {
          totalBookings: 0,
          confirmed: 0,
          cancelled: 0,
          booked: 0,
        },
        bookingsByDay: [],
        bookingStatus: [],
        transactions: [],
      };
    }

    // Extract member IDs
    const memberIds = members.map((m) => m.id);

    // 2️⃣ PT booking stats
    const [bookingStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
      FROM unified_bookings ub
  LEFT JOIN member m ON ub.memberId = m.id  -- This join ensures we link the correct member.id from unified_bookings
  WHERE m.adminId = ?  -- Filtering by adminId to ensure we're only pulling bookings for this admin
    AND ub.bookingType = 'PT'`,
      [adminId]
    );

    // 3️⃣ PT bookings group by day
    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(createdAt) AS date,
        COUNT(*) AS count
      FROM unified_bookings ub
  LEFT JOIN member m ON ub.memberId = m.id  -- Ensuring the correct join for memberId
  WHERE m.adminId = ? 
    AND ub.bookingType = 'PT'  -- Only group bookings
  GROUP BY DATE(ub.createdAt)
  ORDER BY date ASC`,
      [adminId]
    );

    // 4️⃣ PT booking status distribution
    const [bookingStatus] = await pool.query(
      `SELECT 
        bookingStatus,
        COUNT(*) AS count
      FROM unified_bookings ub
  LEFT JOIN member m ON ub.memberId = m.id  -- Correctly joining with member.id
  WHERE m.adminId = ?
    AND ub.bookingType = 'PT'  -- Only group bookings
  GROUP BY ub.bookingStatus`,
      [adminId]
    );

    // 5️⃣ PT transactions list
    const [transactions] = await pool.query(
      `SELECT 
          ub.date,
          trainerUser.fullName AS trainerName,
          memberUser.fullName AS memberName,
          'Personal Training' AS type,
          ub.startTime AS time,
          ub.bookingStatus AS status
        FROM unified_bookings ub
        LEFT JOIN user AS trainerUser 
              ON ub.trainerId = trainerUser.id
        LEFT JOIN member AS m
              ON ub.memberId = m.id
        LEFT JOIN user AS memberUser
              ON m.userId = memberUser.id
       WHERE m.adminId = ?
    AND ub.bookingType = 'PT'  -- Only group bookings
  ORDER BY ub.date DESC`,
      [adminId]
    );

    // Format output for UI
    const formattedStats = {
      totalBookings: bookingStats[0].totalBookings || 0,
      confirmed: bookingStats[0].confirmed || 0,
      cancelled: bookingStats[0].cancelled || 0,
      booked: bookingStats[0].booked || 0,
    };

    const formattedTransactions = transactions.map((tx) => ({
      date: tx.date,
      trainer: tx.trainerName || "N/A",
      username: tx.memberName || "N/A",
      type: tx.type,
      time: tx.time,
      status: tx.status,
    }));

    return {
      stats: formattedStats,
      bookingsByDay,
      bookingStatus,
      transactions: formattedTransactions,
    };
  } catch (error) {
    throw new Error(
      `Error generating personal trainer report: ${error.message}`
    );
  }
};

// export const getReceptionReportService = async (adminId) => {

//   // 1️⃣ Get admin's branchId
//   const [adminData] = await pool.query(
//     `SELECT branchId FROM user WHERE id = ? LIMIT 1`,
//     [adminId]
//   );

//   if (adminData.length === 0) {
//     return { error: "Admin not found" };
//   }

//   const branchId = adminData[0].branchId;

//   // ------------------ SUMMARY (ALL TIME) ------------------

//   // ✔ All-time check-ins
//   const [[checkinsSummary]] = await pool.query(
//     `SELECT COUNT(*) AS total
//      FROM memberattendance
//      WHERE branchId = ?`,
//     [branchId]
//   );

//   // ✔ All-time new members
//   const [[newMembersSummary]] = await pool.query(
//     `SELECT COUNT(*) AS total
//      FROM member
//      WHERE branchId = ?`,
//     [branchId]
//   );

//   // ✔ All-time payments (No branchId column)
//   const [[paymentsSummary]] = await pool.query(
//     `SELECT IFNULL(SUM(amount), 0) AS total
//      FROM payment`
//   );

//   // ✔ All PT bookings
//   const [[ptSummary]] = await pool.query(
//     `SELECT COUNT(*) AS total
//      FROM unified_bookings
//      WHERE branchId = ?
//      AND bookingType = 'PT'`,
//     [branchId]
//   );

//   // ✔ All Class bookings
//   const [[classSummary]] = await pool.query(
//     `SELECT COUNT(*) AS total
//      FROM unified_bookings
//      WHERE branchId = ?
//      AND bookingType = 'CLASS'`,
//     [branchId]
//   );

//   // ------------------ FULL LISTS (ALL TIME) ------------------

//   // All Check-ins list
//   const [checkinsList] = await pool.query(
//     `SELECT *
//      FROM memberattendance
//      WHERE branchId = ?`,
//     [branchId]
//   );

//   // All Members list
//   const [newMembersList] = await pool.query(
//     `SELECT *
//      FROM member
//      WHERE branchId = ?`,
//     [branchId]
//   );

//   // All Payments list
//   const [paymentsList] = await pool.query(
//     `SELECT *
//      FROM payment`
//   );

//   // All PT Bookings list
//   const [ptList] = await pool.query(
//     `SELECT *
//      FROM unified_bookings
//      WHERE branchId = ?
//      AND bookingType = 'PT'`,
//     [branchId]
//   );

//   // All Class Bookings list
//   const [classList] = await pool.query(
//     `SELECT *
//      FROM unified_bookings
//      WHERE branchId = ?
//      AND bookingType = 'CLASS'`,
//     [branchId]
//   );

//   // ------------------ FINAL RETURN ------------------

//   return {
//     success: true,
//     summary: {
//       totalCheckins: checkinsSummary.total,
//       totalMembers: newMembersSummary.total,
//       totalPayments: paymentsSummary.total,
//       totalPTBookings: ptSummary.total,
//       totalClassBookings: classSummary.total
//     },
//     checkins: checkinsList,
//     members: newMembersList,
//     payments: paymentsList,
//     ptSessions: ptList,
//     classSessions: classList
//   };
// };

export const getReceptionReportService = async (adminId) => {
  // 1️⃣ Fetch all branches of this admin
  const [branches] = await pool.query(
    `SELECT id FROM branch WHERE adminId = ?`,
    [adminId]
  );
  const branchIds = branches.map(b => b.id);

  // ---------------- WEEKLY ATTENDANCE (ALL BRANCHES) ----------------
  const [members] = await pool.query(
    `SELECT userId FROM member WHERE adminId = ?`,
    [adminId]
  );

  if (members.length === 0) {
    return { error: "No members found for this admin" };
  }

  const memberUserIds = members.map((m) => m.userId);

  const [weekly] = await pool.query(
    `
      SELECT 
          DAYNAME(ma.checkIn) AS day,
          COUNT(*) AS count,
          DAYOFWEEK(ma.checkIn) AS sortOrder
      FROM memberattendance ma
      WHERE DATE(ma.checkIn) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND ma.memberId IN (?)
      GROUP BY day, sortOrder
      ORDER BY sortOrder
      `,
    [memberUserIds]
  );

  // ---------------- TODAY SUMMARY (ALL BRANCHES) ----------------

  const [[present]] = await pool.query(
    `SELECT COUNT(*) AS count 
       FROM memberattendance ma
       WHERE DATE(ma.checkIn)=CURDATE() 
         AND ma.memberId IN (?)`,
    [memberUserIds]
  );

  const [[active]] = await pool.query(
    `SELECT COUNT(*) AS count 
       FROM memberattendance ma
       WHERE DATE(ma.checkIn)=CURDATE() 
         AND ma.checkOut IS NULL
         AND ma.memberId IN (?)`,
    [memberUserIds]
  );

  const [[completed]] = await pool.query(
    `SELECT COUNT(*) AS count 
       FROM memberattendance ma
       WHERE DATE(ma.checkIn)=CURDATE() 
         AND ma.checkOut IS NOT NULL
         AND ma.memberId IN (?)`,
    [memberUserIds]
  );

  // TODAY CHECK-INS COUNT (ALL BRANCHES)
  const [[todayCheckinsCount]] = await pool.query(
    `
      SELECT COUNT(*) AS count
      FROM memberattendance ma
      WHERE DATE(ma.checkIn) = CURDATE()
        AND ma.memberId IN (?)
      `,
    [memberUserIds]
  );

  // ---------------- REVENUE ----------------
  const [[revenue]] = await pool.query(
    `SELECT SUM(p.amount) AS total
   FROM payment p
   JOIN member m ON p.memberId = m.id
   WHERE m.adminId = ?`,
    [adminId]
  );

  // ---------------- RECEPTIONIST LIST (ALL BRANCHES) ----------------
  const [receptionists] = await pool.query(
    `
      SELECT s.id, s.userId, s.branchId
      FROM staff s
      WHERE s.adminId = ?
      `,
    [adminId]
  );

  let receptionistStats = [];

  for (const r of receptionists) {
    const { userId, branchId } = r;

    // 3️⃣ Fetch receptionist's full name from the 'user' table using userId
    const [[userDetails]] = await pool.query(
      `SELECT fullName FROM user WHERE id = ?`,
      [userId]
    );

    // 4️⃣ Fetch stats for each receptionist based on their userId
    const [[totalCheckins]] = await pool.query(
      `SELECT COUNT(*) AS count 
     FROM memberattendance ma
     WHERE ma.memberId = ?`,
      [userId]
    );

    const [[activeMembers]] = await pool.query(
      `SELECT COUNT(*) AS count 
     FROM memberattendance ma
     WHERE ma.memberId = ? AND ma.checkOut IS NULL`,
      [userId]
    );

    const [[completedMembers]] = await pool.query(
      `SELECT COUNT(*) AS count 
     FROM memberattendance ma
     WHERE ma.memberId = ? AND ma.checkOut IS NOT NULL`,
      [userId]
    );

    // Push the receptionist stats with their name
    receptionistStats.push({
      receptionistId: r.id,
      name: userDetails?.fullName || "N/A", // Fetch full name from user table
      branchId,
      totalCheckins: totalCheckins.count,
      activeMembers: activeMembers.count,
      completedMembers: completedMembers.count,
      totalRevenue: revenue?.total || 0,
    });
  }

  return {
    branches: branchIds,
    weeklyTrend: weekly,
    todayCheckinsCount: todayCheckinsCount.count,
    summary: {
      present: present.count,
      active: active.count,
      completed: completed.count,
    },
    revenue: {
      total: revenue?.total || 0,
    },
    receptionists: receptionistStats,
  };
};

// export const getMemberAttendanceReportService = async (adminId) => {
//   // 1️⃣ Fetch all branches of this admin
//   const [branches] = await pool.query(
//     `SELECT id FROM branch WHERE adminId = ?`,
//     [adminId]
//   );

//   if (branches.length === 0) return { error: "No branches found" };

//   const branchIds = branches.map(b => b.id);

//   // ------------------------------------------------------------
//   // 🔵 PART-1: ATTENDANCE HEATMAP (LAST 30 DAYS)
//   // ------------------------------------------------------------

//   const [heatmap] = await pool.query(
//     `
//     SELECT
//       DATE(checkIn) AS date,
//       COUNT(*) AS checkins
//     FROM memberattendance
//     WHERE branchId IN (?)
//       AND DATE(checkIn) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
//     GROUP BY DATE(checkIn)
//     ORDER BY DATE(checkIn)
//     `,
//     [branchIds]
//   );

//   // ------------------------------------------------------------
//   // 🔵 PART-2: MEMBER-WISE ATTENDANCE SUMMARY
//   // ------------------------------------------------------------

//   const [memberStats] = await pool.query(
//     `
//     SELECT
//       m.id AS memberId,
//       m.fullName,
//       COUNT(ma.id) AS totalCheckins,

//       SUM(
//         CASE
//           WHEN ma.checkOut IS NOT NULL THEN
//             TIMESTAMPDIFF(
//               MINUTE,
//               ma.checkIn,
//               ma.checkOut
//             )
//           ELSE 0
//         END
//       ) AS totalMinutes,

//       SUM(
//         CASE
//           WHEN ma.checkOut IS NULL THEN 1
//           ELSE 0
//         END
//       ) AS noShows

//     FROM member m
//     LEFT JOIN memberattendance ma
//       ON ma.memberId = m.id
//       AND ma.branchId IN (?)

//     WHERE m.branchId IN (?)

//     GROUP BY m.id, m.fullName
//     ORDER BY m.fullName;
//     `,
//     [branchIds, branchIds]
//   );

//   // Convert session minutes → average session time
//   const finalMemberStats = memberStats.map(m => ({
//     memberId: m.memberId,
//     fullName: m.fullName,
//     checkins: m.totalCheckins,
//     noShows: m.noShows,
//     avgSessionTime: m.totalCheckins > 0
//       ? Math.round(m.totalMinutes / m.totalCheckins) + " min"
//       : "0 min"
//   }));

//   return {
//     heatmap,
//     members: finalMemberStats
//   };
// };

// export const getMemberAttendanceReportService = async (adminId) => {
//   // 1️⃣ Get all members under this admin
//   const [members] = await pool.query(
//     `SELECT m.id AS memberId, m.userId
//      FROM member m
//      WHERE m.adminId = ?`,
//     [adminId]
//   );

//   if (members.length === 0) return { error: "No members found" };

//   const memberIds = members.map((m) => m.memberId); // Ensure it's 'memberId'
//   const userIds = members.map((m) => m.userId);

//   // Dynamically create placeholders for the IN clause
//   const placeholders = memberIds.map(() => "?").join(",");

//   console.log(
//     "SQL Query with Member IDs:",
//     `
//     SELECT
//       DATE(checkIn) AS date,
//       COUNT(*) AS checkins
//     FROM memberattendance
//     WHERE memberId IN (${placeholders})
//       AND DATE(checkIn) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
//     GROUP BY DATE(checkIn)
//     ORDER BY DATE(checkIn)
//   `
//   );

//   console.log("Member IDs:", memberIds);

//   // 2️⃣ Execute the query for heatmap data
//   const [heatmap] = await pool.query(
//     `
//     SELECT
//       DATE(checkIn) AS date,
//       COUNT(*) AS checkins
//     FROM memberattendance
//     WHERE memberId IN (${placeholders})
//       AND DATE(checkIn) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
//     GROUP BY DATE(checkIn)
//     ORDER BY DATE(checkIn)
//     `,
//     memberIds // Pass the memberIds array as the parameter
//   );

//   console.log("Heatmap Results:", heatmap); // Check what the query returns

//   // ------------------------------------------------------------
//   // 🔵 PART-2: MEMBER-WISE ATTENDANCE SUMMARY (NO JOIN ISSUES)
//   // ------------------------------------------------------------

//   const [attendanceSummary] = await pool.query(
//     `
//     SELECT
//       memberId,
//       COUNT(id) AS totalCheckins,

//       SUM(
//         CASE
//           WHEN checkOut IS NULL THEN 1
//           ELSE 0
//         END
//       ) AS noShows,

//       SUM(
//         CASE
//           WHEN checkOut IS NOT NULL THEN
//             TIMESTAMPDIFF(MINUTE, checkIn, checkOut)
//           ELSE 0
//         END
//       ) AS totalMinutes

//     FROM memberattendance
//     WHERE memberId IN (?)
//     GROUP BY memberId
//     `,
//     [memberIds]
//   );

//   const [users] = await pool.query(
//     `
//     SELECT id AS userId, fullName
//     FROM user
//     WHERE id IN (?)
//     `,
//     [userIds]
//   );

//   // Create a map of userId to fullName
//   const userMap = {};
//   users.forEach((u) => {
//     userMap[u.userId] = u.fullName;
//   });

//   // Final formatted response
//   const finalMembers = attendanceSummary.map((r) => ({
//     memberId: r.memberId,
//     fullName: userMap[r.userId] || "Unknown Member", // Use userId to get fullName
//     checkins: r.totalCheckins,
//     noShows: r.noShows,
//     avgSessionTime:
//       r.totalCheckins > 0
//         ? Math.round(r.totalMinutes / r.totalCheckins) + " min"
//         : "0 min",
//   }));

//   return {
//     heatmap,
//     members: finalMembers,
//   };
// };
export const getMemberAttendanceReportService = async (adminId) => {
  // 1️⃣ Get all members under this admin
  const [members] = await pool.query(
    `SELECT m.id AS memberId, m.userId, m.fullName
     FROM member m
     WHERE m.adminId = ?`,
    [adminId]
  );

  if (members.length === 0) return { error: "No members found" };

  const memberIds = members.map((m) => m.memberId); // Ensure it's 'memberId'
  const userIds = members.map((m) => m.userId);

  // Dynamically create placeholders for the IN clause
  const placeholders = memberIds.map(() => "?").join(",");

  // 2️⃣ Execute the query for heatmap data
  const [heatmap] = await pool.query(
    `
    SELECT 
      DATE(checkIn) AS date,
      COUNT(*) AS checkins
    FROM memberattendance
    WHERE memberId IN (${placeholders})
      AND DATE(checkIn) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(checkIn)
    ORDER BY DATE(checkIn)
    `,
    memberIds
  );

  // ------------------------------------------------------------
  // 🔵 PART-2: MEMBER-WISE ATTENDANCE SUMMARY (NO JOIN ISSUES)
  // ------------------------------------------------------------

  const [attendanceSummary] = await pool.query(
    `
    SELECT 
      memberId,
      COUNT(id) AS totalCheckins,
      
      SUM(
        CASE 
          WHEN checkOut IS NULL THEN 1 
          ELSE 0 
        END
      ) AS noShows,

      SUM(
        CASE 
          WHEN checkOut IS NOT NULL THEN 
            TIMESTAMPDIFF(MINUTE, checkIn, checkOut)
          ELSE 0 
        END
      ) AS totalMinutes

    FROM memberattendance
    WHERE memberId IN (?)
    GROUP BY memberId
    `,
    [memberIds]
  );

  const [users] = await pool.query(
    `
    SELECT id AS userId, fullName
    FROM user
    WHERE id IN (?)
    `,
    [userIds]
  );

  // Create a map of userId to fullName
  const userMap = {};
  users.forEach((u) => {
    userMap[u.userId] = u.fullName;
  });

  // Final formatted response with fallback for missing userId
  const finalMembers = attendanceSummary.map((r) => {
    // Check if userId exists in the userMap
    const memberFullName =
      userMap[r.userId] ||
      members.find((m) => m.memberId === r.memberId)?.fullName ||
      "Unknown Member";

    return {
      memberId: r.memberId,
      fullName: memberFullName, // Use fallback name or member's full name
      checkins: r.totalCheckins,
      noShows: r.noShows,
      avgSessionTime:
        r.totalCheckins > 0
          ? Math.round(r.totalMinutes / r.totalCheckins) + " min"
          : "0 min",
    };
  });

  return {
    heatmap,
    members: finalMembers,
  };
};

// export const generateManagerReportService = async (adminId) => {
//   try {
//     const [branches] = await pool.query(
//       `SELECT id FROM branch WHERE adminId = ?`,
//       [adminId]
//     );

//     if (branches.length === 0) {
//       return {
//         memberOverview: {},
//         revenueSummary: {},
//         sessionsSummary: {},
//         classSummary: {},
//         inventorySummary: {},
//         alertTaskSummary: {},
//       };
//     }

//     const branchIds = branches.map((b) => b.id);
//     const ph = branchIds.map(() => "?").join(",");

//     const [
//       memberOverviewData,
//       revenueSummaryData,
//       sessionsSummaryData,
//       classSummaryData,
//       inventorySummaryData,
//       alertTaskSummaryData,
//     ] = await Promise.all([
//       // MEMBER OVERVIEW
//       pool.query(
//         `SELECT
//             COUNT(*) AS totalMembers,
//             SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeMembers,
//             SUM(CASE WHEN DATE(joinDate) = CURDATE() THEN 1 ELSE 0 END) AS newMembersToday,
//             SUM(CASE WHEN membershipTo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
//                      THEN 1 ELSE 0 END) AS expiringSoon,
//             (
//               SELECT COUNT(*)
//               FROM memberattendance
//               WHERE DATE(checkIn) = CURDATE()
//                 AND branchId IN (${ph})
//             ) AS todayCheckins
//          FROM member
//          WHERE branchId IN (${ph})`,
//         [...branchIds, ...branchIds]
//       ),

//       // REVENUE SUMMARY
//       pool.query(
//         `SELECT
//             IFNULL(SUM(amount), 0) AS monthlyRevenue,
//             IFNULL(SUM(CASE WHEN DATE(paymentDate) = CURDATE() THEN amount ELSE 0 END), 0) AS todayRevenue,
//             IFNULL(SUM(gstAmount), 0) AS gstTotal
//          FROM payment
//          WHERE memberId IN (
//             SELECT id FROM member WHERE branchId IN (${ph})
//          )`,
//         branchIds
//       ),

//       // SESSIONS SUMMARY
//       pool.query(
//         `SELECT
//             COUNT(*) AS totalSessions,
//             IFNULL(SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END), 0) AS completedSessions,
//             IFNULL(SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelledSessions,
//             (
//               SELECT u.fullName
//               FROM unified_bookings ub
//               LEFT JOIN user u ON ub.trainerId = u.id
//               WHERE ub.branchId IN (${ph})
//                 AND ub.bookingStatus = 'Completed'
//               GROUP BY ub.trainerId
//               ORDER BY COUNT(*) DESC
//               LIMIT 1
//             ) AS topTrainer
//          FROM unified_bookings
//          WHERE branchId IN (${ph})`,
//         [...branchIds, ...branchIds]
//       ),

//       // CLASS SUMMARY
//       pool.query(
//         `SELECT
//             (
//               SELECT COUNT(*)
//               FROM classschedule
//               WHERE DATE(date) = CURDATE()
//                 AND branchId IN (${ph})
//             ) AS todayClasses,

//             (
//               SELECT COUNT(*)
//               FROM group_class_bookings
//               WHERE DATE(date) = CURDATE()
//                 AND branchId IN (${ph})
//             ) AS todayClassAttendance,

//             (
//               SELECT className
//               FROM classschedule
//               WHERE branchId IN (${ph})
//               GROUP BY className
//               ORDER BY COUNT(*) DESC
//               LIMIT 1
//             ) AS popularClass`,
//         [...branchIds, ...branchIds, ...branchIds]
//       ),

//       // INVENTORY SUMMARY
//       pool.query(
//         `SELECT
//             COUNT(*) AS totalProducts,
//             IFNULL(SUM(CASE WHEN currentStock < 5 THEN 1 ELSE 0 END), 0) AS lowStockItems
//          FROM product
//          WHERE branchId IN (${ph})`,
//         branchIds
//       ),

//       // ALERTS + TASKS
//       pool.query(
//         `SELECT
//             (
//               SELECT COUNT(*)
//               FROM tasks
//               WHERE status != 'Completed'
//                 AND branchId IN (${ph})
//             ) AS pendingTasks,

//             (
//               SELECT COUNT(*)
//               FROM alert
//               WHERE branchId IN (${ph})
//             ) AS totalAlerts`,
//         [...branchIds, ...branchIds]
//       ),
//     ]);

//     return {
//       memberOverview: memberOverviewData[0][0],
//       revenueSummary: revenueSummaryData[0][0],
//       sessionsSummary: sessionsSummaryData[0][0],
//       classSummary: classSummaryData[0][0],
//       inventorySummary: inventorySummaryData[0][0],
//       alertTaskSummary: alertTaskSummaryData[0][0],
//     };
//   } catch (error) {
//     throw new Error(`Manager Report Error: ${error.message}`);
//   }
// };

// export const generatePersonalTrainerReportByStaffService = async (adminId, staffId) => {

//   try {
//     // 1️⃣ Verify the staff belongs to the admin
//     const [staffVerification] = await pool.query(
//       `SELECT s.id, s.userId, u.fullName
//        FROM staff s
//        JOIN user u ON s.userId = u.id
//        WHERE s.id = ? AND s.adminId = ?`,
//       [staffId, adminId]
//     );

//     if (staffVerification.length === 0) {
//       return {
//         stats: {
//           totalBookings: 0,
//           confirmed: 0,
//           cancelled: 0,
//           booked: 0
//         },
//         bookingsByDay: [],
//         bookingStatus: [],
//         transactions: []
//       };
//     }

//     // Get the userId of the staff member
//     const staffUserId = staffVerification[0].userId;

//     // 2️⃣ PT booking stats for this specific staff member
//     const [bookingStats] = await pool.query(
//       `SELECT
//         COUNT(*) as totalBookings,
//         SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END) as confirmed,
//         SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
//         SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
//       FROM unified_bookings
//       WHERE trainerId = ?
//         AND bookingType = 'PT'`,
//       [staffUserId]
//     );

//     // 3️⃣ PT bookings group by day for this staff member
//     const [bookingsByDay] = await pool.query(
//       `SELECT
//         DATE(createdAt) AS date,
//         COUNT(*) AS count
//       FROM unified_bookings
//       WHERE trainerId = ?
//         AND bookingType = 'PT'
//       GROUP BY DATE(createdAt)
//       ORDER BY date ASC`,
//       [staffUserId]
//     );

//     // 4️⃣ PT booking status distribution for this staff member
//     const [bookingStatus] = await pool.query(
//       `SELECT
//         bookingStatus,
//         COUNT(*) AS count
//       FROM unified_bookings
//       WHERE trainerId = ?
//         AND bookingType = 'PT'
//       GROUP BY bookingStatus`,
//       [staffUserId]
//     );

//     // 5️⃣ PT transactions list for this staff member
//     const [transactions] = await pool.query(
//       `SELECT
//           ub.date,
//           trainerUser.fullName AS trainerName,
//           memberUser.fullName AS memberName,
//           'Personal Training' AS type,
//           ub.startTime AS time,
//           ub.bookingStatus AS status
//         FROM unified_bookings ub
//         LEFT JOIN user AS trainerUser
//               ON ub.trainerId = trainerUser.id
//         LEFT JOIN member AS m
//               ON ub.memberId = m.id
//         LEFT JOIN user AS memberUser
//               ON m.userId = memberUser.id
//         WHERE ub.trainerId = ?
//           AND ub.bookingType = 'PT'
//         ORDER BY ub.date DESC`,
//       [staffUserId]
//     );

//     // Format output for UI
//     const formattedStats = {
//       totalBookings: bookingStats[0].totalBookings || 0,
//       confirmed: bookingStats[0].confirmed || 0,
//       cancelled: bookingStats[0].cancelled || 0,
//       booked: bookingStats[0].booked || 0
//     };

//     const formattedTransactions = transactions.map(tx => ({
//       date: tx.date,
//       trainer: tx.trainerName || 'N/A',
//       username: tx.memberName || 'N/A',
//       type: tx.type,
//       time: tx.time,
//       status: tx.status
//     }));

//     return {
//       stats: formattedStats,
//       bookingsByDay,
//       bookingStatus,
//       transactions: formattedTransactions
//     };

//   } catch (error) {
//     throw new Error(`Error generating personal trainer report by staff: ${error.message}`);
//   }
// };

// export const generatePersonalTrainerReportByStaffService = async (adminId, staffId) => {
//   try {
//     // 1️⃣ Verify the staff belongs to the admin
//     const [staffVerification] = await pool.query(
//       `SELECT s.id, s.userId, u.fullName
//        FROM staff s
//        JOIN user u ON s.userId = u.id
//        WHERE s.id = ? AND s.adminId = ?`,
//       [staffId, adminId]
//     );

//     if (staffVerification.length === 0) {
//       return {
//         stats: {
//           totalBookings: 0,
//           confirmed: 0,
//           cancelled: 0,
//           booked: 0
//         },
//         bookingsByDay: [],
//         bookingStatus: [],
//         transactions: []
//       };
//     }

//     // Get the userId of the staff member
//     const staffUserId = staffVerification[0].userId;

//     // 2️⃣ PT booking stats for this specific staff member
//     const [bookingStats] = await pool.query(
//       `SELECT
//         COUNT(*) as totalBookings,
//         SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END) as confirmed,
//         SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
//         SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
//       FROM unified_bookings
//       WHERE trainerId = ?
//         AND bookingType = 'PT'`,
//       [staffUserId]
//     );

//     // 3️⃣ PT bookings group by day for this staff member
//     const [bookingsByDay] = await pool.query(
//       `SELECT
//         DATE(createdAt) AS date,
//         COUNT(*) AS count
//       FROM unified_bookings
//       WHERE trainerId = ?
//         AND bookingType = 'PT'
//       GROUP BY DATE(createdAt)
//       ORDER BY date ASC`,
//       [staffUserId]
//     );

//     // 4️⃣ PT booking status distribution for this staff member
//     const [bookingStatus] = await pool.query(
//       `SELECT
//         bookingStatus,
//         COUNT(*) AS count
//       FROM unified_bookings
//       WHERE trainerId = ?
//         AND bookingType = 'PT'
//       GROUP BY bookingStatus`,
//       [staffUserId]
//     );

//     // 5️⃣ PT transactions list for this staff member (FIXED)
//     const [transactions] = await pool.query(
//       `SELECT
//           ub.date,
//           trainerUser.fullName AS trainerName,
//           m.fullName AS memberName,  -- Get name directly from member table
//           'Personal Training' AS type,
//           ub.startTime AS time,
//           ub.bookingStatus AS status
//         FROM unified_bookings ub
//         LEFT JOIN user AS trainerUser
//               ON ub.trainerId = trainerUser.id
//         LEFT JOIN member AS m
//               ON ub.memberId = m.id
//         WHERE ub.trainerId = ?
//           AND ub.bookingType = 'PT'
//         ORDER BY ub.date DESC`,
//       [staffUserId]
//     );

//     // Format output for UI
//     const formattedStats = {
//       totalBookings: bookingStats[0].totalBookings || 0,
//       confirmed: bookingStats[0].confirmed || 0,
//       cancelled: bookingStats[0].cancelled || 0,
//       booked: bookingStats[0].booked || 0
//     };

//     const formattedTransactions = transactions.map(tx => ({
//       date: tx.date,
//       trainer: tx.trainerName || 'N/A',
//       username: tx.memberName || 'N/A',
//       type: tx.type,
//       time: tx.time,
//       status: tx.status
//     }));

//     return {
//       stats: formattedStats,
//       bookingsByDay,
//       bookingStatus,
//       transactions: formattedTransactions
//     };

//   } catch (error) {
//     throw new Error(`Error generating personal trainer report by staff: ${error.message}`);
//   }
// };

export const generateManagerReportService = async (adminId) => {
  try {
    const [
      memberOverviewData,
      revenueSummaryData,
      sessionsSummaryData,
      classSummaryData,
      inventorySummaryData,
      alertTaskSummaryData,
    ] = await Promise.all([
      // MEMBER OVERVIEW
      pool.query(
        `SELECT
            COUNT(*) AS totalMembers,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeMembers,
            SUM(CASE WHEN DATE(joinDate) = CURDATE() THEN 1 ELSE 0 END) AS newMembersToday,
            SUM(CASE WHEN membershipTo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                     THEN 1 ELSE 0 END) AS expiringSoon,
            (
              SELECT COUNT(*) 
              FROM memberattendance 
              WHERE DATE(checkIn) = CURDATE()
                AND memberId IN (SELECT userId FROM member WHERE adminId = ?)
            ) AS todayCheckins
         FROM member
         WHERE adminId = ?`,
        [adminId, adminId]
      ),

      // REVENUE SUMMARY
      pool.query(
        `SELECT 
            IFNULL(SUM(amount), 0) AS monthlyRevenue,
            IFNULL(SUM(CASE WHEN DATE(paymentDate) = CURDATE() THEN amount ELSE 0 END), 0) AS todayRevenue,
            IFNULL(SUM(gstAmount), 0) AS gstTotal
         FROM payment
         WHERE memberId IN (SELECT id FROM member WHERE adminId = ?)`,
        [adminId]
      ),

      // SESSIONS SUMMARY
      pool.query(
        `SELECT
            COUNT(*) AS totalSessions,
            IFNULL(SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END), 0) AS completedSessions,
            IFNULL(SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelledSessions,
            (
              SELECT u.fullName
              FROM unified_bookings ub
              LEFT JOIN user u ON ub.trainerId = u.id
              WHERE ub.bookingStatus = 'Completed'
                AND ub.memberId IN (SELECT id FROM member WHERE adminId = ?)
              GROUP BY ub.trainerId
              ORDER BY COUNT(*) DESC
              LIMIT 1
            ) AS topTrainer
         FROM unified_bookings
         WHERE memberId IN (SELECT id FROM member WHERE adminId = ?);`,
        [adminId, adminId]
      ),

      // CLASS SUMMARY
      pool.query(
        `SELECT
            (
              SELECT COUNT(*) 
              FROM classschedule cs
              INNER JOIN user u ON cs.trainerId=u.id 
              WHERE DATE(cs.date) = CURDATE()
                AND u.adminId = ?
            ) AS todayClasses,

            (
              SELECT COUNT(*) 
              FROM group_class_bookings 
              WHERE DATE(date) = CURDATE()
                AND memberId IN (SELECT id FROM member WHERE adminId = ?)
            ) AS todayClassAttendance,

            (
              SELECT className 
              FROM classschedule cs
              INNER JOIN user u ON cs.trainerId=u.id
              WHERE u.adminId = ?
              GROUP BY cs.className
              ORDER BY COUNT(*) DESC
              LIMIT 1
            ) AS popularClass`,
        [adminId, adminId, adminId]
      ),

      // INVENTORY SUMMARY
      pool.query(
        `SELECT
            COUNT(*) AS totalProducts,
            IFNULL(SUM(CASE WHEN currentStock < 5 THEN 1 ELSE 0 END), 0) AS lowStockItems
         FROM product
         WHERE branchId IN (SELECT id FROM branch WHERE adminId = ?)`,
        [adminId]
      ),

      // ALERTS + TASKS
      pool.query(
        `SELECT
            (
              SELECT COUNT(*) 
              FROM tasks 
              WHERE status != 'Completed'
                AND createdById = ?
            ) AS pendingTasks,

            (
              SELECT COUNT(*) 
              FROM alert a
              INNER JOIN staff s ON a.staffId=s.id
              WHERE s.adminId = ?
            ) AS totalAlerts`,
        [adminId, adminId]
      ),
    ]);

    return {
      memberOverview: memberOverviewData[0][0],
      revenueSummary: revenueSummaryData[0][0],
      sessionsSummary: sessionsSummaryData[0][0],
      classSummary: classSummaryData[0][0],
      inventorySummary: inventorySummaryData[0][0],
      alertTaskSummary: alertTaskSummaryData[0][0],
    };
  } catch (error) {
    throw new Error(`Manager Report Error: ${error.message}`);
  }
};

export const generatePersonalTrainerReportByStaffService = async (
  adminId,
  staffId,
  fromDate = null,
  toDate = null
) => {
  try {
    // 1️⃣ Verify the staff belongs to the admin
    const [staffVerification] = await pool.query(
      `SELECT s.id, s.userId, u.fullName 
       FROM staff s
       JOIN user u ON s.userId = u.id
       WHERE s.id = ? AND s.adminId = ?`,
      [staffId, adminId]
    );

    if (staffVerification.length === 0) {
      return {
        stats: {
          totalBookings: 0,
          completed: 0,
          cancelled: 0,
          booked: 0,
        },
        bookingsByDay: [],
        bookingStatus: [],
        transactions: [],
      };
    }

    const staffUserId = staffVerification[0].userId;

    // Helper function to build the date filter part of the query
    const getDateFilterQuery = () => {
      if (fromDate && toDate) {
        return `AND ub.date BETWEEN ? AND ?`;
      }
      if (fromDate) {
        return `AND ub.date >= ?`;
      }
      if (toDate) {
        return `AND ub.date <= ?`;
      }
      return ""; // No date filter
    };

    // Helper function to build the parameters array for the date filter
    const getDateFilterParams = () => {
      const params = [];
      if (fromDate) params.push(fromDate);
      if (toDate) params.push(toDate);
      return params;
    };

    const dateFilterQuery = getDateFilterQuery();
    const dateFilterParams = getDateFilterParams();

    // 2️⃣ PT booking stats for this specific staff member with date filter
    const [bookingStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END) + 0 as completed,
        SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) + 0 as cancelled,
        SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) + 0 as booked
      FROM unified_bookings ub
      WHERE ub.trainerId = ?
        AND ub.bookingType = 'PT'
        ${dateFilterQuery}`,
      [staffUserId, ...dateFilterParams]
    );

    // 3️⃣ PT bookings group by day with date filter
    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(ub.date) AS date,
        COUNT(*) AS count
      FROM unified_bookings ub
      WHERE ub.trainerId = ?
        AND ub.bookingType = 'PT'
        ${dateFilterQuery}
      GROUP BY DATE(ub.date)
      ORDER BY date ASC`,
      [staffUserId, ...dateFilterParams]
    );

    // 4️⃣ PT booking status distribution with date filter
    const [bookingStatus] = await pool.query(
      `SELECT 
        ub.bookingStatus,
        COUNT(*) AS count
      FROM unified_bookings ub
      WHERE ub.trainerId = ?
        AND ub.bookingType = 'PT'
        ${dateFilterQuery}
      GROUP BY ub.bookingStatus`,
      [staffUserId, ...dateFilterParams]
    );

    // 5️⃣ PT transactions list with date filter
    const [transactions] = await pool.query(
      `SELECT 
          ub.date,
          trainerUser.fullName AS trainerName,
          m.fullName AS memberName,
          'Personal Training' AS type,
          ub.startTime AS time,
          ub.bookingStatus AS status
        FROM unified_bookings ub
        LEFT JOIN user AS trainerUser 
              ON ub.trainerId = trainerUser.id
        LEFT JOIN member AS m
              ON ub.memberId = m.id
        WHERE ub.trainerId = ?
          AND ub.bookingType = 'PT'
          ${dateFilterQuery}
        ORDER BY ub.date DESC, ub.startTime DESC`,
      [staffUserId, ...dateFilterParams]
    );

    // Format output for UI (no changes needed here)
    const formattedStats = {
      totalBookings: bookingStats[0].totalBookings || 0,
      completed: bookingStats[0].completed || 0,
      cancelled: bookingStats[0].cancelled || 0,
      booked: bookingStats[0].booked || 0,
    };

    const formattedTransactions = transactions.map((tx) => ({
      date: tx.date,
      trainer: tx.trainerName || "N/A",
      username: tx.memberName || "N/A",
      type: tx.type,
      time: tx.time,
      status: tx.status,
    }));

    return {
      stats: formattedStats,
      bookingsByDay,
      bookingStatus,
      transactions: formattedTransactions,
    };
  } catch (error) {
    throw new Error(
      `Error generating personal trainer report by staff: ${error.message}`
    );
  }
};

export const generateGeneralTrainerReportByStaffService = async (
  adminId,
  staffId,
  fromDate = null,
  toDate = null
) => {
  try {
    // 1️⃣ Verify the staff belongs to the admin
    const [staffVerification] = await pool.query(
      `SELECT s.id, s.userId, u.fullName 
       FROM staff s
       JOIN user u ON s.userId = u.id
       WHERE s.id = ? AND s.adminId = ?`,
      [staffId, adminId]
    );

    if (staffVerification.length === 0) {
      return {
        stats: {
          totalBookings: 0,
          totalRevenue: 0,
          avgTicket: 0,
          completed: 0,
          cancelled: 0,
          booked: 0,
        },
        bookingsByDay: [],
        bookingStatus: [],
        transactions: [],
      };
    }

    // Get the userId of the staff member to use as trainerId
    const staffUserId = staffVerification[0].userId;

    // Helper function to build the date filter part of the query
    const getDateFilterQuery = () => {
      if (fromDate && toDate) {
        return `AND ub.date BETWEEN ? AND ?`;
      }
      if (fromDate) {
        return `AND ub.date >= ?`;
      }
      if (toDate) {
        return `AND ub.date <= ?`;
      }
      return ""; // No date filter
    };

    // Helper function to build the parameters array for the date filter
    const getDateFilterParams = () => {
      const params = [];
      if (fromDate) params.push(fromDate);
      if (toDate) params.push(toDate);
      return params;
    };

    const dateFilterQuery = getDateFilterQuery();
    const dateFilterParams = getDateFilterParams();

    // 2️⃣ Get booking statistics for GROUP bookings for this specific trainer
    const [bookingStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        0 as totalRevenue,
        0 as avgTicket,
        SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END) + 0 as completed,
        SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) + 0 as cancelled,
        SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) + 0 as booked
      FROM unified_bookings ub
      WHERE ub.trainerId = ?
        AND ub.bookingType = 'GROUP'
        ${dateFilterQuery}`,
      [staffUserId, ...dateFilterParams]
    );

    // 3️⃣ Bookings by day for this trainer
    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(ub.date) as date,
        COUNT(*) as count
      FROM unified_bookings ub
      WHERE ub.trainerId = ?
        AND ub.bookingType = 'GROUP'
        ${dateFilterQuery}
      GROUP BY DATE(ub.date)
      ORDER BY date ASC`,
      [staffUserId, ...dateFilterParams]
    );

    // 4️⃣ Booking status distribution for this trainer
    const [bookingStatus] = await pool.query(
      `SELECT 
        ub.bookingStatus,
        COUNT(*) as count
      FROM unified_bookings ub
      WHERE ub.trainerId = ?
        AND ub.bookingType = 'GROUP'
        ${dateFilterQuery}
      GROUP BY ub.bookingStatus`,
      [staffUserId, ...dateFilterParams]
    );

    // 5️⃣ Transactions list for this trainer (JOIN IS FIXED HERE)
    const [transactions] = await pool.query(
      `SELECT 
          ub.date,
          trainerUser.fullName AS trainerName,
          m.fullName AS memberName, -- Get name directly from member table
          'Group Training' AS type,
          ub.startTime AS time,
          ub.bookingStatus AS status
        FROM unified_bookings ub
        LEFT JOIN user AS trainerUser 
            ON ub.trainerId = trainerUser.id
        LEFT JOIN member AS m
            ON ub.memberId = m.id
        WHERE ub.trainerId = ?
          AND ub.bookingType = 'GROUP'
          ${dateFilterQuery}
        ORDER BY ub.date DESC, ub.startTime DESC`,
      [staffUserId, ...dateFilterParams]
    );

    // Format summary stats (identical to original)
    const formattedStats = {
      totalBookings: bookingStats[0].totalBookings || 0,
      totalRevenue: bookingStats[0].totalRevenue || 0,
      avgTicket: bookingStats[0].avgTicket || 0,
      completed: bookingStats[0].completed || 0,
      cancelled: bookingStats[0].cancelled || 0,
      booked: bookingStats[0].booked || 0,
    };

    // Format transaction list (identical to original)
    const formattedTransactions = transactions.map((tx) => ({
      date: tx.date,
      trainer: tx.trainerName || "N/A",
      username: tx.memberName || "N/A",
      type: tx.type,
      time: tx.time,
      status: tx.status,
    }));

    return {
      stats: formattedStats,
      bookingsByDay,
      bookingStatus,
      transactions: formattedTransactions,
    };
  } catch (error) {
    throw new Error(
      `Error generating general trainer report by staff: ${error.message}`
    );
  }
};

export const generateAdminHousekeepingReportService = async (
  adminId,
  startDate,
  endDate
) => {
  try {
    if (!adminId) {
      throw new Error("adminId is required");
    }

    /* =====================================================
       1️⃣ GET HOUSEKEEPING STAFF (roleId = 8)
    ===================================================== */
    const [staffMembers] = await pool.query(
      `
      SELECT 
        s.id,
        s.status,
        u.id AS userId,
        u.fullName,
        u.email,
        u.phone
      FROM staff s
      JOIN user u ON s.userId = u.id
      WHERE s.adminId = ?
        AND u.roleId = 8
      `,
      [adminId]
    );

    /* =====================================================
       2️⃣ EMPTY STAFF GUARD (🔥 LIVE FIX)
    ===================================================== */
    if (staffMembers.length === 0) {
      return {
        adminId,
        reportDate: new Date(),
        dateRange: { startDate, endDate },
        summary: {
          totalStaff: 0,
          activeStaff: 0,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          overallTaskCompletionRate: 0,
          totalAttendanceRecords: 0,
          presentDays: 0,
          overallAttendanceRate: 0,
        },
        staffDetails: [],
      };
    }

    /* =====================================================
       3️⃣ GET HOUSEKEEPING TASKS
    ===================================================== */
    let taskQuery = `
      SELECT 
        t.*,
        u.fullName AS assignedToName
      FROM tasks t
      JOIN staff s ON t.assignedTo = s.id
      JOIN user u ON s.userId = u.id
      WHERE t.createdById = ?
        AND u.roleId = 8
        AND t.taskTitle LIKE '%housekeeping%'
    `;

    const taskParams = [adminId];

    if (startDate && endDate) {
      taskQuery += ` AND t.createdAt BETWEEN ? AND ?`;
      taskParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    const [housekeepingTasks] = await pool.query(taskQuery, taskParams);

    /* =====================================================
       4️⃣ GET ATTENDANCE (🔥 IN () SAFE)
    ===================================================== */
    const staffIds = staffMembers.map((s) => s.id);

    let attendanceQuery = `
      SELECT 
        ma.*,
        u.fullName AS staffName
      FROM memberattendance ma
      JOIN staff s ON ma.staffId = s.id
      JOIN user u ON s.userId = u.id
      WHERE ma.staffId IN (?)
        AND u.roleId = 8
    `;

    const attendanceParams = [staffIds];

    if (startDate && endDate) {
      attendanceQuery += ` AND ma.checkIn BETWEEN ? AND ?`;
      attendanceParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    const [attendanceRecords] = await pool.query(
      attendanceQuery,
      attendanceParams
    );

    /* =====================================================
       5️⃣ STAFF LEVEL REPORT
    ===================================================== */
    const staffReport = staffMembers.map((staff) => {
      const staffTasks = housekeepingTasks.filter(
        (t) => t.assignedTo === staff.id
      );

      const staffAttendance = attendanceRecords.filter(
        (a) => a.staffId === staff.id
      );

      const completedTasks = staffTasks.filter(
        (t) => t.status === "Completed"
      ).length;

      const taskCompletionRate =
        staffTasks.length > 0
          ? ((completedTasks / staffTasks.length) * 100).toFixed(2)
          : "0.00";

      const totalDays = staffAttendance.length;
      const presentDays = staffAttendance.filter(
        (a) => a.status === "Present"
      ).length;

      const attendanceRate =
        totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : "0.00";

      let totalMinutes = 0;
      let daysWithCheckout = 0;

      staffAttendance.forEach((a) => {
        if (a.checkOut) {
          totalMinutes += (new Date(a.checkOut) - new Date(a.checkIn)) / 60000;
          daysWithCheckout++;
        }
      });

      const avgWorkingHours =
        daysWithCheckout > 0
          ? (totalMinutes / daysWithCheckout / 60).toFixed(2)
          : "0.00";

      return {
        staffId: staff.id,
        staffName: staff.fullName,
        email: staff.email,
        phone: staff.phone,
        status: staff.status,

        totalTasks: staffTasks.length,
        completedTasks,
        pendingTasks: staffTasks.filter((t) => t.status === "Pending").length,
        inProgressTasks: staffTasks.filter((t) => t.status === "In Progress")
          .length,
        taskCompletionRate,

        attendanceMetrics: {
          totalDays,
          presentDays,
          attendanceRate,
          avgWorkingHours,
        },

        recentTasks: staffTasks.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.taskTitle,
          description: t.description,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
        })),

        recentAttendance: staffAttendance.slice(0, 5).map((a) => ({
          id: a.id,
          checkIn: a.checkIn,
          checkOut: a.checkOut,
          status: a.status,
          notes: a.notes,
        })),
      };
    });

    /* =====================================================
       6️⃣ SUMMARY
    ===================================================== */
    const summary = {
      totalStaff: staffMembers.length,
      activeStaff: staffMembers.filter((s) => s.status === "Active").length,

      totalTasks: housekeepingTasks.length,
      completedTasks: housekeepingTasks.filter((t) => t.status === "Completed")
        .length,
      pendingTasks: housekeepingTasks.filter((t) => t.status === "Pending")
        .length,
      inProgressTasks: housekeepingTasks.filter(
        (t) => t.status === "In Progress"
      ).length,

      overallTaskCompletionRate:
        housekeepingTasks.length > 0
          ? (
              (housekeepingTasks.filter((t) => t.status === "Completed")
                .length /
                housekeepingTasks.length) *
              100
            ).toFixed(2)
          : "0.00",

      totalAttendanceRecords: attendanceRecords.length,
      presentDays: attendanceRecords.filter((a) => a.status === "Present")
        .length,

      overallAttendanceRate:
        attendanceRecords.length > 0
          ? (
              (attendanceRecords.filter((a) => a.status === "Present").length /
                attendanceRecords.length) *
              100
            ).toFixed(2)
          : "0.00",
    };

    return {
      adminId,
      reportDate: new Date(),
      dateRange: { startDate, endDate },
      summary,
      staffDetails: staffReport,
    };
  } catch (error) {
    console.error("HOUSEKEEPING REPORT ERROR:", error);
    throw error; // 🔥 real error expose
  }
};

// Generate housekeeping report for a specific staff member
export const generateStaffHousekeepingReportService = async (
  adminId,
  staffId,
  startDate,
  endDate
) => {
  try {
    /* =====================================================
       1️⃣ VERIFY STAFF (ADMIN + ROLE)
    ===================================================== */
    const [staffResult] = await pool.query(
      `
      SELECT 
        s.id,
        s.status,
        s.joinDate,
        u.id AS userId,
        u.fullName,
        u.email,
        u.phone,
        u.profileImage,
        u.roleId
      FROM staff s
      JOIN user u ON s.userId = u.id
      WHERE s.id = ?
        AND s.adminId = ?
        AND u.roleId = 8
      `,
      [staffId, adminId]
    );

    if (staffResult.length === 0) {
      return {
        adminId,
        staffId,
        reportDate: new Date(),
        dateRange: { startDate, endDate },
        message: "No housekeeping staff found for this admin",
        staffInfo: null,
        taskMetrics: {},
        attendanceMetrics: {},
        recentTasks: [],
        recentAttendance: [],
      };
    }

    const staff = staffResult[0];

    /* =====================================================
       2️⃣ DATE RANGE NORMALIZATION (LIVE FIX)
    ===================================================== */
    let fromDate = null;
    let toDate = null;

    if (startDate && endDate) {
      fromDate = `${startDate} 00:00:00`;
      toDate = `${endDate} 23:59:59`;
    }

    /* =====================================================
       3️⃣ FETCH TASKS
    ===================================================== */
    let taskQuery = `
      SELECT *
      FROM tasks
      WHERE assignedTo = ?
        AND taskTitle LIKE '%housekeeping%'
    `;
    const taskParams = [staffId];

    if (fromDate && toDate) {
      taskQuery += ` AND createdAt BETWEEN ? AND ?`;
      taskParams.push(fromDate, toDate);
    }

    const [housekeepingTasks] = await pool.query(taskQuery, taskParams);

    /* =====================================================
       4️⃣ FETCH ATTENDANCE (⚠️ TABLE CASE SAFE)
    ===================================================== */
    let attendanceQuery = `
      SELECT *
      FROM memberattendance   -- ✅ keep lowercase for Linux
      WHERE staffId = ?
    `;
    const attendanceParams = [staffId];

    if (fromDate && toDate) {
      attendanceQuery += ` AND checkIn BETWEEN ? AND ?`;
      attendanceParams.push(fromDate, toDate);
    }

    const [attendanceRecords] = await pool.query(
      attendanceQuery,
      attendanceParams
    );

    /* =====================================================
       5️⃣ TASK METRICS
    ===================================================== */
    const completedTasks = housekeepingTasks.filter(
      (t) => t.status === "Completed"
    ).length;
    const pendingTasks = housekeepingTasks.filter(
      (t) => t.status === "Pending"
    ).length;
    const inProgressTasks = housekeepingTasks.filter(
      (t) => t.status === "In Progress"
    ).length;

    const taskCompletionRate =
      housekeepingTasks.length > 0
        ? ((completedTasks / housekeepingTasks.length) * 100).toFixed(2)
        : "0.00";

    const tasksByPriority = {
      High: housekeepingTasks.filter((t) => t.priority === "High").length,
      Medium: housekeepingTasks.filter((t) => t.priority === "Medium").length,
      Low: housekeepingTasks.filter((t) => t.priority === "Low").length,
    };

    /* =====================================================
       6️⃣ ATTENDANCE METRICS
    ===================================================== */
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (r) => r.status === "Present"
    ).length;

    const attendanceRate =
      totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : "0.00";

    let totalMinutes = 0;
    let daysWithCheckout = 0;

    attendanceRecords.forEach((r) => {
      if (r.checkOut) {
        const checkIn = new Date(r.checkIn);
        const checkOut = new Date(r.checkOut);
        totalMinutes += (checkOut - checkIn) / (1000 * 60);
        daysWithCheckout++;
      }
    });

    const avgWorkingHours =
      daysWithCheckout > 0
        ? (totalMinutes / daysWithCheckout / 60).toFixed(2)
        : "0.00";

    /* =====================================================
       7️⃣ ATTENDANCE BY MONTH
    ===================================================== */
    const attendanceByMonth = {};

    attendanceRecords.forEach((r) => {
      const month = new Date(r.checkIn).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      });

      if (!attendanceByMonth[month]) {
        attendanceByMonth[month] = { total: 0, present: 0 };
      }

      attendanceByMonth[month].total++;
      if (r.status === "Present") attendanceByMonth[month].present++;
    });

    Object.keys(attendanceByMonth).forEach((m) => {
      const d = attendanceByMonth[m];
      d.rate = d.total > 0 ? ((d.present / d.total) * 100).toFixed(2) : "0.00";
    });

    /* =====================================================
       8️⃣ FINAL RESPONSE
    ===================================================== */
    return {
      adminId,
      staffId,
      staffInfo: {
        id: staff.id,
        fullName: staff.fullName,
        email: staff.email,
        phone: staff.phone,
        profileImage: staff.profileImage,
        status: staff.status,
        joinDate: staff.joinDate,
        roleId: staff.roleId,
      },
      reportDate: new Date(),
      dateRange: { startDate, endDate },
      taskMetrics: {
        total: housekeepingTasks.length,
        completed: completedTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completionRate: taskCompletionRate,
        byPriority: tasksByPriority,
      },
      attendanceMetrics: {
        totalDays,
        presentDays,
        attendanceRate,
        avgWorkingHours,
        byMonth: attendanceByMonth,
      },
      recentTasks: housekeepingTasks.slice(0, 10),
      recentAttendance: attendanceRecords.slice(0, 10),
    };
  } catch (error) {
    console.error("STAFF HOUSEKEEPING REPORT ERROR:", error);
    throw error; // 🔥 ORIGINAL ERROR THROW (LIVE DEBUG)
  }
};
