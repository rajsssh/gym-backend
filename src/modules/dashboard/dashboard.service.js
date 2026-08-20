import { pool } from "../../config/db.js";
import { startOfMonth } from "date-fns";

export const dashboardService = async () => {
  const today = new Date();
  const monthStart = startOfMonth(today);

  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const conn = pool;

  // --- Total Revenue ---
  const [[totalRevenueRow]] = await conn.query(
    "SELECT SUM(amount) AS totalRevenue FROM payment"
  );
  const totalRevenue = Number(totalRevenueRow.totalRevenue || 0);

  // --- New Members This Month ---
  const [[newMembersRow]] = await conn.query(
    "SELECT COUNT(*) AS count FROM member WHERE joinDate >= ?",
    [monthStartStr]
  );
  const newMembers = Number(newMembersRow.count);

  // --- Active Members ---
  const [[activeMembersRow]] = await conn.query(
    "SELECT COUNT(*) AS count FROM member WHERE membershipTo >= ?",
    [todayStr]
  );
  const activeMembers = Number(activeMembersRow.count);

  // --- Check-ins This Month ---
  const [[checkInsRow]] = await conn.query(
    "SELECT COUNT(*) AS count FROM memberattendance WHERE checkIn >= ?",
    [monthStartStr]
  );
  const checkIns = Number(checkInsRow.count);

  // --- PT Revenue ---
  const [[ptRevenueRow]] = await conn.query(
    `SELECT COALESCE(SUM(p.amount),0) AS revenue
     FROM payment p
     JOIN plan pl ON p.planId = pl.id
     WHERE pl.category = 'PT'`
  );
  const ptRevenue = Number(ptRevenueRow.revenue);

  // --- Overdue Members ---
  const [[arOverdueRow]] = await conn.query(
    "SELECT COUNT(*) AS count FROM member WHERE membershipTo < ?",
    [todayStr]
  );
  const arOverdue = Number(arOverdueRow.count);

  // --- Revenue Graph ---
  const [revenueGraphRows] = await conn.query(
    `SELECT DATE(paymentDate) AS day, SUM(amount) AS revenue
     FROM payment
     WHERE paymentDate >= ?
     GROUP BY DATE(paymentDate)
     ORDER BY DATE(paymentDate)`,
    [monthStartStr]
  );
  const revenueGraph = revenueGraphRows.map(r => ({
    day: r.day,
    revenue: Number(r.revenue),
  }));

  // --- Branch Leaderboard ---
  const [branchLeaderboardRows] = await conn.query(
    `SELECT 
       b.name AS branch,
       COALESCE((SELECT SUM(amount) FROM payment p JOIN member m ON p.memberId = m.id WHERE m.branchId = b.id AND p.paymentDate >= ?), 0) AS revenue,
       COALESCE((SELECT COUNT(*) FROM member m WHERE m.branchId = b.id AND m.joinDate >= ?), 0) AS new
     FROM branch b
     ORDER BY revenue DESC`,
    [monthStartStr, monthStartStr]
  );
  const branchLeaderboard = branchLeaderboardRows.map(b => ({
    branch: b.branch,
    revenue: Number(b.revenue),
    new: Number(b.new),
  }));

  // --- Total & Monthly Expenses & Profit ---
  const [[manualExpRow]] = await conn.query("SELECT COALESCE(SUM(amount), 0) AS total FROM expense").catch(() => [[{ total: 0 }]]);
  const [[salaryExpRow]] = await conn.query("SELECT COALESCE(SUM(netPay), 0) AS total FROM salary").catch(() => [[{ total: 0 }]]);
  const totalExpenses = Number(manualExpRow?.total || 0) + Number(salaryExpRow?.total || 0);
  const netProfit = totalRevenue - totalExpenses;

  const [[monthlyManualExpRow]] = await conn.query("SELECT COALESCE(SUM(amount), 0) AS total FROM expense WHERE date >= ?", [monthStartStr]).catch(() => [[{ total: 0 }]]);
  const [[monthlySalaryExpRow]] = await conn.query("SELECT COALESCE(SUM(netPay), 0) AS total FROM salary WHERE periodEnd >= ?", [monthStartStr]).catch(() => [[{ total: 0 }]]);
  const monthlyExpenses = Number(monthlyManualExpRow?.total || 0) + Number(monthlySalaryExpRow?.total || 0);

  const [[monthRevRow]] = await conn.query("SELECT COALESCE(SUM(amount), 0) AS total FROM payment WHERE paymentDate >= ?", [monthStartStr]).catch(() => [[{ total: 0 }]]);
  const monthlyRevenue = Number(monthRevRow?.total || 0);
  const monthlyProfit = monthlyRevenue - monthlyExpenses;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    monthlyRevenue,
    monthlyExpenses,
    monthlyProfit,
    newMembers,
    activeMembers,
    checkIns,
    ptRevenue,
    arOverdue,
    revenueGraph,
    branchLeaderboard,
    dashboardAlerts: [],
  };
};


// import { pool } from "../../config/db.js";

// export const superAdminDashboardService = async () => {
//   // 1️⃣ Total Revenue
//   const [[totalRevenue]] = await pool.query(
//     `SELECT SUM(amountPaid) AS totalRevenue FROM member`
//   );

//   // 2️⃣ Monthly Revenue (current month)
//   const [[monthlyRevenue]] = await pool.query(
//     `SELECT SUM(amountPaid) AS monthlyRevenue
//      FROM member
//      WHERE MONTH(membershipFrom) = MONTH(CURRENT_DATE())
//        AND YEAR(membershipFrom) = YEAR(CURRENT_DATE())`
//   );

//   // 3️⃣ Total Admins
//   const [[totalAdmins]] = await pool.query(
//     `SELECT COUNT(*) AS totalAdmins FROM user WHERE roleId = 2`
//   );

//   // 4️⃣ New Admins (last 30 days)
//   const [[newAdmins]] = await pool.query(
//     `SELECT COUNT(*) AS newAdmins
//      FROM user 
//      WHERE roleId = 2
//        AND createdAt >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)`
//   );

//   // 5️⃣ Branch Leaderboard
//   const [leaderboard] = await pool.query(
//     `SELECT 
//         b.name AS branchName,
//         SUM(m.amountPaid) AS revenue,
//         COUNT(m.id) AS newMembers
//      FROM branch b
//      LEFT JOIN member m ON b.id = m.branchId
//      GROUP BY b.id
//      ORDER BY revenue DESC`
//   );


//   // exp

//   return {
//     totalRevenue: totalRevenue.totalRevenue || 0,
//     monthlyRevenue: monthlyRevenue.monthlyRevenue || 0,
//     totalAdmins: totalAdmins.totalAdmins,
//     newAdmins: newAdmins.newAdmins,
//     leaderboard
//   };
// };

export const superAdminDashboardService = async (branchId = null) => {
  const bId = (branchId === "all" || branchId === "") ? null : branchId;

  // Helper for adding WHERE clause
  const getBranchFilter = (tableAlias) => {
    return bId ? ` AND ${tableAlias}.branchId = ${pool.escape(bId)}` : "";
  };

  // ================================
  // 1️⃣ TOTAL REVENUE
  // ================================
  const [[totalRev]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS totalRevenue FROM purchase WHERE status = 'approved'`
  );

  // ================================
  // 2️⃣ MONTHLY REVENUE
  // ================================
  const [[monthlyRev]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS monthlyRevenue 
     FROM purchase 
     WHERE status = 'approved' 
       AND MONTH(startDate) = MONTH(CURRENT_DATE()) 
       AND YEAR(startDate) = YEAR(CURRENT_DATE())`
  );

  // ================================
  // 3️⃣ TOTAL ADMINS
  // ================================
  // Admins might not belong to a specific branch in the same way, or maybe they do?
  // User table has branchId.
  const [[adminCount]] = await pool.query(
    `SELECT COUNT(*) AS totalAdmins FROM user u WHERE roleId = 2 ${getBranchFilter('u')}`
  );

  // ================================
  // 4️⃣ NEW ADMINS THIS MONTH
  // ================================
  const [[newAdmins]] = await pool.query(
    `SELECT COUNT(*) AS newAdmins 
     FROM user u
     WHERE roleId = 2 AND MONTH(createdAt) = MONTH(CURRENT_DATE())
     ${getBranchFilter('u')}`
  );

  // ================================
  // 5️⃣ BRANCH LEADERBOARD
  // ================================
  // We keep the full leaderboard so the dropdown still shows all branches, 
  // or maybe we don't filter the leaderboard so they can switch easily.
  const [branchLeaderboard] = await pool.query(
    `SELECT 
        b.id AS branchId,
        b.name AS branchName,
        COALESCE((SELECT SUM(amount) FROM payment p JOIN member m ON p.memberId = m.id WHERE m.branchId = b.id), 0) AS revenue,
        COALESCE((SELECT COUNT(*) FROM member m WHERE m.branchId = b.id), 0) AS newMembers
     FROM branch b
     ORDER BY revenue DESC`
  );

  // ================================
  // 6️⃣ REVENUE VS TARGET GRAPH DATA
  // ================================

  // Get daily revenue of current month
  const [revRows] = await pool.query(
    `SELECT 
    DAY(startDate) AS day,
    COALESCE(SUM(amount), 0) AS revenue
FROM purchase
WHERE status = 'approved'
  AND MONTH(startDate) = MONTH(CURRENT_DATE())
  AND YEAR(startDate) = YEAR(CURRENT_DATE())
GROUP BY DAY(startDate)
ORDER BY DAY(startDate)
`
  );

  // Prepare map
  const revenueMap = {};
  revRows.forEach(r => {
    revenueMap[r.day] = r.revenue;
  });

  const daysInMonth = new Date().getDate();
  const days = [];
  const revenue = [];
  const target = [];

  let targetValue = 90000;     // starting target
  const growth = 0.05;         // 5% per day

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(String(d).padStart(2, "0"));
    revenue.push(revenueMap[d] || 0);

    targetValue = Math.round(targetValue + targetValue * growth);
    target.push(targetValue);
  }

  return {
    totalRevenue: totalRev.totalRevenue || 0,
    monthlyRevenue: monthlyRev.monthlyRevenue || 0,
    totalAdmins: adminCount.totalAdmins,
    newAdmins: newAdmins.newAdmins,
    branchLeaderboard,
    revenueVsTarget: {
      days,
      revenue,
      target
    }
  };
};

export const superAdminCRMStatsService = async () => {
  // 1. Total Leads and Converted Leads
  const [[leadStats]] = await pool.query(
    `SELECT 
      COUNT(*) AS totalLeads,
      SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) AS convertedLeads
     FROM leads
     WHERE leadType = 'SAAS'`
  );

  const totalLeads = Number(leadStats.totalLeads || 0);
  const convertedLeads = Number(leadStats.convertedLeads || 0);
  const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;

  // 2. Gym-wise / Branch-wise Leads Breakdown
  const [gymBreakdown] = await pool.query(
    `SELECT 
      COALESCE(u.gymName, u.fullName, 'Unknown Gym') AS gymName,
      COALESCE(b.name, 'Main Branch') AS branchName,
      COUNT(l.id) AS totalLeads,
      SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) AS convertedLeads,
      COALESCE(ROUND((SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) / COUNT(l.id)) * 100, 2), 0) AS conversionRate
     FROM leads l
     LEFT JOIN user u ON l.adminId = u.id
     LEFT JOIN branch b ON l.branchId = b.id
     WHERE l.leadType = 'SAAS'
     GROUP BY l.adminId, l.branchId, u.gymName, u.fullName, b.name
     ORDER BY totalLeads DESC`
  );

  // 3. Staff Conversion Leaderboard
  const [staffLeaderboard] = await pool.query(
    `SELECT 
      s.fullName AS staffName,
      COALESCE(u.gymName, u.fullName, 'Unknown Gym') AS gymName,
      COALESCE(b.name, 'Main Branch') AS branchName,
      COUNT(l.id) AS totalLeads,
      SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) AS convertedLeads,
      COALESCE(ROUND((SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END) / COUNT(l.id)) * 100, 2), 0) AS conversionRate
     FROM user s
     LEFT JOIN leads l ON l.assignedToStaffId = s.id
     LEFT JOIN user u ON s.adminId = u.id
     LEFT JOIN branch b ON s.branchId = b.id
     WHERE s.roleId IN (3, 5, 6, 7) AND l.leadType = 'SAAS'
     GROUP BY s.id, s.fullName, u.gymName, u.fullName, b.name
     ORDER BY convertedLeads DESC
     LIMIT 10`
  );

  // 4. 30-Day Trend Chart
  const [trendData] = await pool.query(
    `SELECT 
      DATE_FORMAT(MAX(createdAt), '%Y-%m-%d') AS date,
      COUNT(*) AS totalLeads,
      SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) AS convertedLeads
     FROM leads
     WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND leadType = 'SAAS'
     GROUP BY DATE(createdAt)
     ORDER BY date ASC`
  );

  return {
    summary: {
      totalLeads,
      convertedLeads,
      conversionRate
    },
    gymBreakdown,
    staffLeaderboard,
    trendData
  };
};

