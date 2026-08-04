import { pool } from "../../config/db.js";

// ===== CREATE =====
export const createSalaryService = async (data) => {
  const {
    salaryId,
    staffId,
    role,
    periodStart,
    periodEnd,
    hoursWorked,
    hourlyRate,
    fixedSalary,
    commissionTotal,
    bonuses,
    deductions,
    status,
  } = data;

  const hourlyTotal = (hoursWorked || 0) * (hourlyRate || 0);
  const bonusTotal = bonuses?.reduce((a, b) => a + Number(b.amount), 0) || 0;
  const deductionTotal =
    deductions?.reduce((a, b) => a + Number(b.amount), 0) || 0;

  const netPay =
    hourlyTotal +
    (fixedSalary || 0) +
    (commissionTotal || 0) +
    bonusTotal -
    deductionTotal;

  const [result] = await pool.query(
    `INSERT INTO salary 
      (salaryId, staffId, role, periodStart, periodEnd, hoursWorked, hourlyRate, hourlyTotal,
       fixedSalary, commissionTotal, bonuses, deductions, netPay, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      salaryId,
      staffId,
      role,
      periodStart,
      periodEnd,
      hoursWorked,
      hourlyRate,
      hourlyTotal,
      fixedSalary,
      commissionTotal,
      JSON.stringify(bonuses || []),
      JSON.stringify(deductions || []),
      netPay,
      status,
    ]
  );

  return { id: result.insertId, ...data, netPay };
};

// ===== GET ALL =====
// export const getAllSalariesService = async () => {
//   const [rows] = await pool.query(
//     `SELECT s.*, st.fullName
//      FROM Salary s
//      LEFT JOIN Staff st ON s.staffId = st.id
//      ORDER BY s.id DESC`
//   );
//   return rows;
// };

export const getAllSalariesService = async (adminId) => {
  const sql = `
    SELECT 
      s.*,
      u.fullName AS staffName,
      u.email AS staffEmail,
      u.phone AS staffPhone,
      st.gender,
      st.joinDate
    FROM salary s
    LEFT JOIN staff st ON s.staffId = st.id
    LEFT JOIN user u ON st.userId = u.id
    WHERE st.adminId = ?
    ORDER BY s.id DESC
  `;

  const [rows] = await pool.query(sql, [adminId]);
  return rows;
};


export const getSalaryByIdService = async (identifier) => {
  const sqlBySalaryId = `
    SELECT 
      s.*, 
      u.fullName AS staffName,
      u.email AS staffEmail,
      u.phone AS staffPhone,
      st.gender,
      st.joinDate
    FROM salary s
    LEFT JOIN user u ON s.staffId = u.id
    LEFT JOIN staff st ON st.userId = u.id
    WHERE s.salaryId = ?
    LIMIT 1
  `;

  // try treating identifier as salaryId first
  const [rowsBySalaryId] = await pool.query(sqlBySalaryId, [identifier]);
  if (rowsBySalaryId.length) return rowsBySalaryId[0];

  // fallback: try numeric id
  const sqlById = sqlBySalaryId.replace(
    "WHERE s.salaryId = ?",
    "WHERE s.id = ?"
  );
  const [rowsById] = await pool.query(sqlById, [identifier]);
  if (rowsById.length) return rowsById[0];

  throw new Error("Salary not found");
};

// ===== DELETE =====
export const deleteSalaryService = async (salaryId) => {
  await pool.query(`DELETE FROM salary WHERE id = ?`, [salaryId]);
  return { success: true };
};

// ===== UPDATE =====
// export const updateSalaryService = async (salaryId, data) => {
//   const {
//     salaryId,
//     staffId,
//     role,
//     periodStart,
//     periodEnd,
//     hoursWorked,
//     hourlyRate,
//     fixedSalary,
//     commissionTotal,
//     bonuses,
//     deductions,
//     status
//   } = data;

//   const hourlyTotal = (hoursWorked || 0) * (hourlyRate || 0);
//   const bonusTotal = bonuses?.reduce((a, b) => a + Number(b.amount), 0) || 0;
//   const deductionTotal = deductions?.reduce((a, b) => a + Number(b.amount), 0) || 0;

//   const netPay =
//     hourlyTotal +
//     (fixedSalary || 0) +
//     (commissionTotal || 0) +
//     bonusTotal -
//     deductionTotal;

//   const sql = `
//     UPDATE salary SET
//       salaryId = ?,
//       staffId = ?,          -- USER ID
//       role = ?,
//       periodStart = ?,
//       periodEnd = ?,
//       hoursWorked = ?,
//       hourlyRate = ?,
//       hourlyTotal = ?,
//       fixedSalary = ?,
//       commissionTotal = ?,
//       bonuses = ?,
//       deductions = ?,
//       netPay = ?,
//       status = ?
//     WHERE salaryId = ?
//   `;

//   await pool.query(sql, [
//     salaryId,
//     staffId,
//     role,
//     new Date(periodStart),
//     new Date(periodEnd),
//     hoursWorked,
//     hourlyRate,
//     hourlyTotal,
//     fixedSalary,
//     commissionTotal,
//     JSON.stringify(bonuses || []),
//     JSON.stringify(deductions || []),
//     netPay,
//     status,
//     salaryId
//   ]);

//   return { salaryId, ...data, netPay };
// };

export const updateSalaryService = async (salaryId, data) => {
  const {
    staffId,
    role,
    periodStart,
    periodEnd,
    hoursWorked,
    hourlyRate,
    fixedSalary,
    commissionTotal,
    bonuses,
    deductions,
    status,
  } = data;

  const hourlyTotal = (hoursWorked || 0) * (hourlyRate || 0);
  const bonusTotal = bonuses?.reduce((a, b) => a + Number(b.amount), 0) || 0;
  const deductionTotal =
    deductions?.reduce((a, b) => a + Number(b.amount), 0) || 0;

  const netPay =
    hourlyTotal +
    (fixedSalary || 0) +
    (commissionTotal || 0) +
    bonusTotal -
    deductionTotal;

  const sql = `
    UPDATE salary SET
      staffId = ?,          
      role = ?,
      periodStart = ?,
      periodEnd = ?,
      hoursWorked = ?,
      hourlyRate = ?,
      hourlyTotal = ?,
      fixedSalary = ?,
      commissionTotal = ?,
      bonuses = ?,
      deductions = ?,
      netPay = ?,
      status = ?
    WHERE id = ?
  `;

  await pool.query(sql, [
    staffId,
    role,
    new Date(periodStart),
    new Date(periodEnd),
    hoursWorked,
    hourlyRate,
    hourlyTotal,
    fixedSalary,
    commissionTotal,
    JSON.stringify(bonuses || []),
    JSON.stringify(deductions || []),
    netPay,
    status,
    salaryId, // 🔥 IMPORTANT: now updating by salaryId
  ]);

  return { salaryId, ...data, netPay };
};

// ===== GET BY STAFF ID =====
export const getSalaryByStaffIdService = async (staffId) => {
  const sql = `
    SELECT 
      s.*,
      u.fullName AS staffName,
      u.email AS staffEmail,
      u.phone AS staffPhone,
      st.gender,
      st.joinDate
    FROM salary s
    LEFT JOIN user u ON s.staffId = u.id      -- FIX
    LEFT JOIN staff st ON st.userId = u.id    -- FIX
    WHERE s.staffId = ?
    ORDER BY s.id DESC
  `;

  const [rows] = await pool.query(sql, [staffId]);

  if (!rows.length) throw new Error("No salary records found for this staff");

  return rows;
};
