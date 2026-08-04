import { pool } from "../../config/db.js";
import { sendTemplatedNotification } from "../messageTemplates/messageTemplate.service.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { assignPlansToMember } from "../memberPlanAssignment/memberPlanAssignment.service.js";
import { PaymentCredentialResolver } from "../../utils/credentialResolvers.js";

// --- Invoice generator ---
function generateInvoiceNo() {
  return "INV-" + Date.now() + "-" + Math.floor(Math.random() * 999);
}

// --- RECORD PAYMENT ---
export const recordPaymentService = async (data) => {
  const { memberId, planId, amount, collectedByName, collectedByRole } = data;

  // Verify member exists
  const [[member]] = await pool.query(
    "SELECT * FROM member WHERE id = ?",
    [memberId]
  );
  if (!member) throw { status: 404, message: "Member not found" };

  // Verify plan exists (check memberplan first, then plan)
  let [[plan]] = await pool.query(
    "SELECT * FROM memberplan WHERE id = ?",
    [planId]
  );
  if (!plan) {
    [[plan]] = await pool.query(
      "SELECT * FROM plan WHERE id = ?",
      [planId]
    );
  }
  if (!plan) throw { status: 404, message: "Plan not found" };

  const invoiceNo = generateInvoiceNo();
  // Insert payment
  const [result] = await pool.query(
    `INSERT INTO payment (memberId, planId, amount, invoiceNo, collectedByName, collectedByRole) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [memberId, planId, amount, invoiceNo, collectedByName || null, collectedByRole || null]
  );

  // Trigger global notification dispatch based on Super Admin configurations
  await sendTemplatedNotification({
    eventKey: 'PAYMENT_SUCCESS',
    tenantId: member.adminId || member.userId,
    receiverId: member.userId,
    receiverRole: 'Member',
    receiverEmail: member.email,
    receiverPhone: member.phone,
    variables: {
      Name: member.fullName || "Member",
      Amount: amount
    },
    referenceType: 'PAYMENT',
    referenceId: invoiceNo,
    actionUrl: '/member-dashboard/invoices'
  });

  return {
    id: result.insertId,
    member,
    plan,
    amount,
    invoiceNo,
  };
};

// --- CREATE RAZORPAY ORDER FOR MEMBER ---
export const createRazorpayOrderService = async (data) => {
  const { memberId, amount, planId } = data;

  // Verify member exists and get adminId
  const [[member]] = await pool.query(
    "SELECT * FROM member WHERE id = ?",
    [memberId]
  );
  if (!member) throw { status: 404, message: "Member not found" };

  // Get admin's Razorpay keys from the new resolver
  const tenantCreds = await PaymentCredentialResolver.getTenantRazorpayCredentials(member.adminId);
  
  if (!tenantCreds || !tenantCreds.keyId || !tenantCreds.keySecret) {
    throw { status: 400, message: "Payment Gateway not configured by the Gym Owner. Please contact the Gym Owner." };
  }

  const activeKeyId = tenantCreds.keyId;
  const activeKeySecret = tenantCreds.keySecret;

  // --- MOCK FLOW FOR DUMMY / TEST KEYS ---
  if (activeKeyId.includes("dummy") || activeKeySecret.includes("dummy")) {
    return {
      order: {
        id: "order_mock_" + Date.now(),
        entity: "order",
        amount: (amount || 0) * 100,
        amount_paid: 0,
        amount_due: (amount || 0) * 100,
        currency: "INR",
        receipt: `rcpt_${memberId}_${Date.now()}`,
        status: "created",
      },
      key: activeKeyId,
      isMock: true
    };
  }

  try {
    const razorpay = new Razorpay({
      key_id: activeKeyId,
      key_secret: activeKeySecret,
    });

    const options = {
      amount: Math.round((amount || 0) * 100), // amount in paisa
      currency: "INR",
      receipt: `rcpt_${memberId}_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    return { order, key: activeKeyId };
  } catch (err) {
    console.warn("⚠️ Razorpay API call failed, falling back to mock test order:", err.message);
    return {
      order: {
        id: "order_mock_" + Date.now(),
        entity: "order",
        amount: (amount || 0) * 100,
        amount_paid: 0,
        amount_due: (amount || 0) * 100,
        currency: "INR",
        receipt: `rcpt_${memberId}_${Date.now()}`,
        status: "created",
      },
      key: activeKeyId,
      isMock: true
    };
  }
};

// --- PAYMENT HISTORY FOR MEMBER ---
export const paymentHistoryService = async (memberId) => {
  const [rows] = await pool.query(
    `SELECT p.*, COALESCE(mp.name, pl.name) AS planName, COALESCE(mp.price, pl.price) AS planPrice
     FROM payment p
     LEFT JOIN memberplan mp ON p.planId = mp.id
     LEFT JOIN plan pl ON p.planId = pl.id
     WHERE p.memberId = ?
     ORDER BY p.id DESC`,
    [memberId]
  );
  return rows;
};

// --- ALL PAYMENTS BY ADMIN/BRANCH ---
export const allPaymentsService = async (adminId, branchId, startDate, endDate) => {
  const hasBranchFilter = branchId && branchId !== 'all' && branchId !== '' && branchId !== 'null' && branchId !== 'undefined';
  const hasDateFilter = startDate && endDate;

  let query = `
    SELECT 
      p.id,
      p.memberId,
      p.planId,
      p.amount,
      p.paymentDate,
      p.invoiceNo,
      p.paymentMode,
      p.transactionId,
      p.paymentProofImage,
      COALESCE(p.collectedByName, 'Sales Agent') AS collectedByName,
      COALESCE(p.collectedByRole, 'Staff') AS collectedByRole,
      m.fullName AS memberName,
      COALESCE(mp.name, pl.name, 'Membership Plan') AS planName,
      COALESCE(mp.price, pl.price, p.amount) AS planPrice
    FROM payment p
    JOIN member m ON p.memberId = m.id
    LEFT JOIN memberplan mp ON p.planId = mp.id
    LEFT JOIN plan pl ON p.planId = pl.id
    WHERE m.adminId = ? 
      ${hasBranchFilter ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
      ${hasDateFilter ? "AND DATE(p.paymentDate) BETWEEN ? AND ?" : ""}

    UNION ALL

    SELECT 
      (m.id + 10000) AS id,
      m.id AS memberId,
      m.planId AS planId,
      m.amountPaid AS amount,
      m.joinDate AS paymentDate,
      CONCAT('INV-', m.id) AS invoiceNo,
      'Cash' AS paymentMode,
      NULL AS transactionId,
      NULL AS paymentProofImage,
      'System' AS collectedByName,
      'Registration' AS collectedByRole,
      m.fullName AS memberName,
      COALESCE(mp.name, pl.name, 'Membership Plan') AS planName,
      COALESCE(mp.price, pl.price, m.amountPaid) AS planPrice
    FROM member m
    LEFT JOIN memberplan mp ON m.planId = mp.id
    LEFT JOIN plan pl ON m.planId = pl.id
    WHERE m.adminId = ? AND m.amountPaid > 0 
      ${hasBranchFilter ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
      ${hasDateFilter ? "AND DATE(m.joinDate) BETWEEN ? AND ?" : ""}

    ORDER BY paymentDate DESC
  `;

  const params = [];
  
  // First query (payment table)
  params.push(adminId);
  if (hasBranchFilter) params.push(branchId);
  if (hasDateFilter) {
    params.push(new Date(startDate).toISOString().slice(0, 10));
    params.push(new Date(endDate).toISOString().slice(0, 10));
  }

  // Second query (member registration payments)
  params.push(adminId);
  if (hasBranchFilter) params.push(branchId);
  if (hasDateFilter) {
    params.push(new Date(startDate).toISOString().slice(0, 10));
    params.push(new Date(endDate).toISOString().slice(0, 10));
  }

  const [rows] = await pool.query(query, params);
  return rows;
};

// --- VERIFY MEMBER RAZORPAY PAYMENT ---
export const verifyMemberPaymentService = async (data) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, memberId, planId, amount, adminId, isMock } = data;

  // Get admin's Razorpay keys
  let targetAdminId = adminId;
  if (!targetAdminId) {
    const [[member]] = await pool.query("SELECT adminId FROM member WHERE id = ?", [memberId]);
    if (!member) throw { status: 404, message: "Member not found" };
    targetAdminId = member.adminId;
  }

  const tenantCreds = await PaymentCredentialResolver.getTenantRazorpayCredentials(targetAdminId);
  if (!tenantCreds || !tenantCreds.keySecret) {
    throw { status: 400, message: "Gym Owner Payment Gateway not configured" };
  }

  const activeKeySecret = tenantCreds.keySecret;

  if (!isMock && activeKeySecret && !activeKeySecret.includes("dummy") && !razorpay_order_id?.startsWith("order_mock_")) {
    const generated_signature = crypto
      .createHmac("sha256", activeKeySecret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      throw { status: 400, message: "Invalid payment signature" };
    }
  }

  // Record payment in payment table
  await recordPaymentService({ memberId, planId, amount });

  // Assign the plan
  return await assignPlansToMember({
    memberId,
    plans: [
      {
        planId,
        membershipFrom: new Date().toISOString().split('T')[0],
        paymentMode: "Razorpay",
        amountPaid: amount
      }
    ],
    assignedBy: targetAdminId
  });
};
