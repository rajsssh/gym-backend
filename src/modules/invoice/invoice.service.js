import { pool } from "../../config/db.js";

export const getInvoiceDataService = async (paymentId) => {
  // Get payment with member, plan, admin details, and app settings
  const [rows] = await pool.query(
    `SELECT 
        p.id AS paymentId,
        p.amount,
        p.invoiceNo,
        p.paymentDate,
        p.paymentMode,
        m.id AS memberId,
        m.fullName AS memberName,
        m.email AS memberEmail,
        m.phone AS memberPhone,
        m.address AS memberAddress,
        m.membershipFrom,
        m.membershipTo,
        m.adminId,
        b.id AS branchId,
        b.name AS branchName,
        b.address AS branchAddress,
        pl.id AS planId,
        pl.name AS planName,
        pl.price AS planPrice,
        pl.duration AS planDuration,
        pl.validityDays AS planValidity,
        u.id AS adminUserId,
        u.fullName AS adminName,
        u.gymName AS adminGymName,
        u.gymAddress AS adminGymAddress,
        u.gstNumber AS adminGstNumber,
        u.tax AS adminTax,
        u.phone AS adminPhone,
        u.email AS adminEmail,
        s.gym_name AS settingsGymName
     FROM Payment p
     LEFT JOIN Member m ON m.id = p.memberId
     LEFT JOIN Branch b ON b.id = m.branchId
     LEFT JOIN Plan pl ON pl.id = p.planId
     LEFT JOIN User u ON u.id = m.adminId
     LEFT JOIN app_settings s ON s.adminId = m.adminId
     WHERE p.id = ?`,
    [paymentId]
  );

  if (rows.length === 0) {
    throw { status: 404, message: "Payment / Invoice not found" };
  }

  const payment = rows[0];
  
  // Calculate CGST and SGST (split tax 50-50)
  const taxRate = parseFloat(payment.adminTax || "18");
  const subtotal = parseFloat(payment.amount || 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;
  const totalAmount = subtotal + taxAmount;

  return {
    ...payment,
    subtotal,
    taxRate,
    taxAmount,
    cgstAmount,
    sgstAmount,
    totalAmount
  };
};
