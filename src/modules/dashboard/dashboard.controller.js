import { pool } from "../../config/db.js";
import { dashboardService,superAdminDashboardService, superAdminCRMStatsService } from "./dashboard.service.js";

export const getDashboardData = async (req, res, next) => {
  try {
    const data = await dashboardService();
    res.json({ success: true, dashboard: data });
  } catch (err) {
    next(err);
  }
}




export const getSuperAdminDashboard = async (req, res, next) => {
  try {
    const branchId = req.query.branchId;
    const data = await superAdminDashboardService(branchId);
    res.json({
      success: true,
      message: "Dashboard loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
};

// export const getReceptionistDashboard = async (req, res, next) => {
//   try {
//     const branchId = Number(req.query.branchId) || 1;

//     /* --------------------------------------------------------
//        1️⃣ WEEKLY ATTENDANCE TREND
//     -------------------------------------------------------- */
//     const [weekly] = await pool.query(
//       `
//       SELECT 
//           DAYNAME(checkIn) AS day,
//           COUNT(*) AS count,
//           DAYOFWEEK(checkIn) AS sortOrder
//       FROM memberattendance
//       WHERE DATE(checkIn) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
//         AND branchId = ?
//       GROUP BY day, sortOrder
//       ORDER BY sortOrder
//       `,
//       [branchId]
//     );

//     /* --------------------------------------------------------
//        2️⃣ TODAY SUMMARY
//     -------------------------------------------------------- */
//     const [[present]] = await pool.query(
//       `
//       SELECT COUNT(*) AS count 
//       FROM memberattendance 
//       WHERE DATE(checkIn) = CURDATE()
//         AND branchId = ?
//       `,
//       [branchId]
//     );

//     const [[active]] = await pool.query(
//       `
//       SELECT COUNT(*) AS count 
//       FROM memberattendance 
//       WHERE DATE(checkIn) = CURDATE()
//         AND checkOut IS NULL
//         AND branchId = ?
//       `,
//       [branchId]
//     );

//     const [[completed]] = await pool.query(
//       `
//       SELECT COUNT(*) AS count 
//       FROM memberattendance 
//       WHERE DATE(checkIn) = CURDATE()
//         AND checkOut IS NOT NULL
//         AND branchId = ?
//       `,
//       [branchId]
//     );

//     /* --------------------------------------------------------
//        3️⃣ TOTAL REVENUE
//     -------------------------------------------------------- */
//     const [[revenue]] = await pool.query(
//       `
//       SELECT SUM(amount) AS total
//       FROM payment
//       WHERE branchId = ?
//       `,
//       [branchId]
//     );

//     /* --------------------------------------------------------
//        4️⃣ RESPONSE
//     -------------------------------------------------------- */
//     res.json({
//       success: true,
//       dashboard: {
//         weeklyTrend: weekly,
//         summary: {
//           present: present.count,
//           active: active.count,
//           completed: completed.count,
//         },
//         revenue: {
//           total: revenue?.total || 0,
//         },
//       },
//     });

//   } catch (err) {
//     next(err);
//   }
// };

//  |||||||||||||||||||||||\

// export const getReceptionistDashboard = async (req, res, next) => {
//   try {
//     const branchId = Number(req.query.branchId) || 1;

//     // Weekly Trend
//     const [weekly] = await pool.query(
//       `
//       SELECT 
//           DAYNAME(checkIn) AS day,
//           COUNT(*) AS count,
//           DAYOFWEEK(checkIn) AS sortOrder
//       FROM memberattendance
//       WHERE DATE(checkIn) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
//         AND branchId = ?
//       GROUP BY day, sortOrder
//       ORDER BY sortOrder
//       `,
//       [branchId]
//     );

//     // Today Summary
//     const [[present]] = await pool.query(
//       `SELECT COUNT(*) AS count 
//        FROM memberattendance 
//        WHERE DATE(checkIn) = CURDATE()
//          AND branchId = ?`,
//       [branchId]
//     );

//     const [[active]] = await pool.query(
//       `SELECT COUNT(*) AS count 
//        FROM memberattendance 
//        WHERE DATE(checkIn) = CURDATE()
//          AND checkOut IS NULL
//          AND branchId = ?`,
//       [branchId]
//     );

//     const [[completed]] = await pool.query(
//       `SELECT COUNT(*) AS count 
//        FROM memberattendance 
//        WHERE DATE(checkIn) = CURDATE()
//          AND checkOut IS NOT NULL
//          AND branchId = ?`,
//       [branchId]
//     );

//     // REVENUE FIXED — NO branchId filter
//     const [[revenue]] = await pool.query(
//       `SELECT SUM(amount) AS total FROM payment`
//     );

//     res.json({
//       success: true,
//       dashboard: {
//         weeklyTrend: weekly,
//         summary: {
//           present: present.count,
//           active: active.count,
//           completed: completed.count,
//         },
//         revenue: {
//           total: revenue?.total || 0,
//         },
//       },
//     });

//   } catch (err) {
//     next(err);
//   }
// };

export const getSalesDashboard = async (req, res, next) => {
  try {
    const adminId = Number(req.query.adminId);
    const branchId = (req.query.branchId && req.query.branchId !== "all" && req.query.branchId !== "null" && req.query.branchId !== "undefined") ? Number(req.query.branchId) : null;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const bIdFilter = branchId ? "AND (branchId = ? OR branchId IS NULL)" : "";
    const bIdParams = branchId ? [adminId, branchId] : [adminId];

    // Period selection: 1, 3, 6, or 12 months
    const periodMonths = [1, 3, 6, 12].includes(Number(req.query.period))
      ? Number(req.query.period)
      : 1;

    const periodParams = branchId ? [adminId, branchId, periodMonths] : [adminId, periodMonths];

    /* =========================
       1️⃣ TOTAL REVENUE
    ========================= */
    const [[revenueThisMonth]] = await pool.query(
      `
      SELECT (
        COALESCE((
          SELECT SUM(p.amount)
          FROM payment p
          JOIN member m ON p.memberId = m.id
          WHERE m.adminId = ? ${branchId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
            AND p.paymentDate >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (? - 1) MONTH), '%Y-%m-01')
        ), 0) +
        COALESCE((
          SELECT SUM(m.amountPaid)
          FROM member m
          WHERE m.adminId = ? ${branchId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
            AND m.joinDate >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (? - 1) MONTH), '%Y-%m-01')
        ), 0)
      ) AS total
      `,
      branchId
        ? [adminId, branchId, periodMonths, adminId, branchId, periodMonths]
        : [adminId, periodMonths, adminId, periodMonths]
    );

    /* =========================
       2️⃣ NEW REGISTRATIONS
    ========================= */
    const [[newRegistrations]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM member m
      WHERE m.adminId = ?
        ${branchId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
        AND m.joinDate >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (? - 1) MONTH), '%Y-%m-01')
      `,
      periodParams
    );

    /* =========================
       3️⃣ ACTIVE LEADS
    ========================= */
    const [[activeLeads]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM leads
      WHERE adminId = ?
        ${bIdFilter}
        AND (status IS NULL OR status NOT IN ('Converted', 'Lost'))
      `,
      bIdParams
    );

    /* =========================
       4️⃣ PENDING RENEWALS
    ========================= */
    const [[pendingRenewals]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM member m
      WHERE m.adminId = ?
        ${branchId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
        AND m.membershipTo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      `,
      bIdParams
    );

    /* =========================
       5️⃣ REVENUE VS EXPENSES
    ========================= */
    // Income
    const [incomeData] = await pool.query(
      `
      SELECT 
        DATE_FORMAT(d.date, '%b') AS month,
        YEAR(d.date) AS year,
        MONTH(d.date) AS monthNum,
        SUM(d.amount) AS total
      FROM (
        SELECT joinDate AS date, COALESCE(amountPaid, 0) AS amount
        FROM member
        WHERE adminId = ?
          ${branchId ? "AND (branchId = ? OR branchId IS NULL)" : ""}
          AND joinDate >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (? - 1) MONTH), '%Y-%m-01')
          
        UNION ALL
        
        SELECT p.paymentDate AS date, COALESCE(p.amount, 0) AS amount
        FROM payment p
        JOIN member m ON p.memberId = m.id
        WHERE m.adminId = ?
          ${branchId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
          AND p.paymentDate >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (? - 1) MONTH), '%Y-%m-01')
      ) d
      GROUP BY year, month, monthNum
      ORDER BY year, monthNum
      `,
      [...periodParams, ...periodParams]
    );

    // Expenses
    const [expenseDataRaw] = await pool.query(
      `
      SELECT 
        DATE_FORMAT(e.date, '%b') AS month,
        YEAR(e.date) AS year,
        MONTH(e.date) AS monthNum,
        SUM(e.amount) AS total
      FROM expense e
      JOIN branch b ON e.branchId = b.id
      WHERE b.adminId = ?
        ${branchId ? "AND (e.branchId = ? OR e.branchId IS NULL)" : ""}
        AND e.date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (? - 1) MONTH), '%Y-%m-01')
      GROUP BY year, month, monthNum
      ORDER BY year, monthNum
      `,
      periodParams
    );

    /* =========================
       6️⃣ LEAD CONVERSION
    ========================= */
    const [leadConversion] = await pool.query(
      `
      SELECT COALESCE(status, 'New') AS status, COUNT(*) AS count
      FROM leads
      WHERE adminId = ?
        ${bIdFilter}
      GROUP BY status
      `,
      bIdParams
    );

    /* =========================
       7️⃣ RECENT TRANSACTIONS
    ========================= */
    const [recentTransactions] = await pool.query(
      `
      SELECT 
        m.id,
        CONCAT('INV-', m.id) AS invoiceNo,
        COALESCE(m.amountPaid, 0) AS amount,
        m.joinDate AS paymentDate,
        m.fullName AS memberName,
        pl.name AS planName
      FROM member m
      LEFT JOIN memberplan pl ON m.planId = pl.id
      WHERE m.adminId = ?
        ${branchId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
      ORDER BY m.joinDate DESC
      LIMIT 10
      `,
      bIdParams
    ).catch(() => [[]]);

    /* =========================
       8️⃣ TODAY'S FOLLOW UPS (Leads)
    ========================= */
    const [todayFollowUps] = await pool.query(
      `
      SELECT id, fullName, phone, status, followUpDate
      FROM leads
      WHERE adminId = ?
        ${bIdFilter}
        AND (DATE(followUpDate) = CURDATE() OR followUpDate IS NULL)
      LIMIT 5
      `,
      bIdParams
    );

    res.json({
      success: true,
      dashboard: {
        summary: {
          totalRevenue: revenueThisMonth?.total || 0,
          newRegistrations: newRegistrations?.count || 0,
          activeLeads: activeLeads?.count || 0,
          pendingRenewals: pendingRenewals?.count || 0,
        },
        profitAndLoss: {
          income: incomeData,
          expenses: expenseDataRaw,
        },
        leadConversion: leadConversion,
        recentTransactions: recentTransactions,
        todayFollowUps: todayFollowUps,
      },
    });

  } catch (err) {
    next(err);
  }
};


/* -----------------------------------------------------
SELECT 
  dayname(d) AS day,
  COALESCE((
    SELECT COUNT(*)
    FROM memberattendance 
    WHERE DATE(checkIn) = d AND branchId = ?
  ), 0) AS count
FROM (
  SELECT CURDATE() AS d
  UNION SELECT DATE_SUB(CURDATE(), INTERVAL 1 DAY)
  UNION SELECT DATE_SUB(CURDATE(), INTERVAL 2 DAY)
  UNION SELECT DATE_SUB(CURDATE(), INTERVAL 3 DAY)
  UNION SELECT DATE_SUB(CURDATE(), INTERVAL 4 DAY)
  UNION SELECT DATE_SUB(CURDATE(), INTERVAL 5 DAY)
  UNION SELECT DATE_SUB(CURDATE(), INTERVAL 6 DAY)
) AS days
ORDER BY d;

*/

export const getSuperAdminCRMStats = async (req, res, next) => {
  try {
    const data = await superAdminCRMStatsService();
    res.json({
      success: true,
      message: "Super Admin CRM stats loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
};
