import { pool } from "../../config/db.js";
import { startOfMonth, format } from "date-fns";

export const financeReportService = async (adminId, branchId) => {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  // ---------------- REVENUE ----------------
  const [[{ totalRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(p.amount),0) AS totalRevenue
     FROM Payment p
     JOIN Member m ON m.id = p.memberId
     JOIN branch b ON m.branchId = b.id
     WHERE (? = 0 OR m.branchId = ?) AND b.adminId = ?`,
    [branchId || 0, branchId || 0, adminId]
  );

  const [[{ monthlyRevenue }]] = await pool.query(
    `SELECT COALESCE(SUM(p.amount),0) AS monthlyRevenue
     FROM Payment p
     JOIN Member m ON m.id = p.memberId
     JOIN branch b ON m.branchId = b.id
     WHERE (? = 0 OR m.branchId = ?) AND b.adminId = ? AND p.paymentDate >= ?`,
    [branchId || 0, branchId || 0, adminId, monthStart]
  );

  // ---------------- EXPENSES ----------------
  const [[{ totalExpense }]] = await pool.query(
    `SELECT COALESCE(SUM(e.amount),0) AS totalExpense
     FROM expense e
     JOIN branch b ON e.branchId = b.id
     WHERE (? = 0 OR e.branchId = ?) AND b.adminId = ?`,
    [branchId || 0, branchId || 0, adminId]
  );

  const [[{ monthlyExpense }]] = await pool.query(
    `SELECT COALESCE(SUM(e.amount),0) AS monthlyExpense
     FROM expense e
     JOIN branch b ON e.branchId = b.id
     WHERE (? = 0 OR e.branchId = ?) AND b.adminId = ? AND e.date >= ?`,
    [branchId || 0, branchId || 0, adminId, monthStart]
  );

  // ---------------- PROFIT ----------------
  const netProfit = totalRevenue - totalExpense;
  const monthlyProfit = monthlyRevenue - monthlyExpense;

  // ---------------- GRAPH DATA ----------------
  const [revenueGraph] = await pool.query(
    `SELECT DATE_FORMAT(p.paymentDate, '%Y-%m') AS month, SUM(p.amount) AS total
     FROM Payment p
     JOIN Member m ON m.id = p.memberId
     JOIN branch b ON m.branchId = b.id
     WHERE (? = 0 OR m.branchId = ?) AND b.adminId = ?
     GROUP BY DATE_FORMAT(p.paymentDate, '%Y-%m')
     ORDER BY month ASC`,
    [branchId || 0, branchId || 0, adminId]
  );

  const [expenseGraph] = await pool.query(
    `SELECT DATE_FORMAT(e.date, '%Y-%m') AS month, SUM(e.amount) AS total
     FROM expense e
     JOIN branch b ON e.branchId = b.id
     WHERE (? = 0 OR e.branchId = ?) AND b.adminId = ?
     GROUP BY DATE_FORMAT(e.date, '%Y-%m')
     ORDER BY month ASC`,
    [branchId || 0, branchId || 0, adminId]
  );

  return {
    totalRevenue,
    totalExpense,
    netProfit,
    monthlyRevenue,
    monthlyExpense,
    monthlyProfit,
    revenueGraph,
    expenseGraph,
  };
};
