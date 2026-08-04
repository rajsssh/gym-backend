import {
  recordPaymentService,
  createRazorpayOrderService,
  verifyMemberPaymentService,
  paymentHistoryService,
  allPaymentsService,
} from "./payment.service.js";

import { assignPlansToMember } from "../memberPlanAssignment/memberPlanAssignment.service.js";
import { createMemberService } from "../member/member.service.js";
import { pool } from "../../config/db.js";

import { getIO } from "../../config/socket.js";

export const recordPayment = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      collectedByName: req.user?.fullName || null,
      collectedByRole: req.user?.roleName || null
    };
    const p = await recordPaymentService(payload);

    // Get adminId to assign plan
    const adminId = req.user?.adminId || req.user?.id;
    
    // Assign the plan using the payment details
    try {
      await assignPlansToMember({
        memberId: req.body.memberId,
        plans: [
          {
            planId: req.body.planId,
            membershipFrom: new Date().toISOString().split('T')[0],
            paymentMode: req.body.paymentMode || "Cash",
            amountPaid: req.body.amount,
            trainerName: req.body.trainerName || null
          }
        ],
        assignedBy: adminId
      });
    } catch (assignErr) {
      console.warn("Notice: Plan assignment warning:", assignErr.message);
    }

    // ⚡ Realtime Socket Emission for Instant Dashboard & Revenue Sync
    try {
      const io = getIO();
      if (io) {
        io.emit("dashboardStatsUpdated", { type: "PAYMENT_COMPLETED", adminId, amount: req.body.amount });
        io.emit("paymentCompleted", { adminId, amount: req.body.amount });
        io.emit("revenueUpdated", { adminId, amount: req.body.amount });
      }
    } catch (socErr) {
      console.warn("Socket emission notice:", socErr.message);
    }

    res.json({ success: true, payment: p });
  } catch (err) {
    next(err);
  }
};

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const result = await createRazorpayOrderService(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const verifyMemberPayment = async (req, res, next) => {
  try {
    const result = await verifyMemberPaymentService(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const paymentHistory = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const list = await paymentHistoryService(memberId);
    res.json({ success: true, payments: list });
  } catch (err) {
    next(err);
  }
};

export const allPayments = async (req, res, next) => {
  try {
    const branchId = req.params.branchId;
    const adminId = req.query.adminId; // Need adminId from query for proper fetching
    const { startDate, endDate } = req.query;
    const list = await allPaymentsService(adminId, branchId, startDate, endDate);
    res.json({ success: true, payments: list });
  } catch (err) {
    next(err);
  }
};

export const submitPublicPayment = async (req, res, next) => {
  try {
    const { 
      adminId, fullName, phone, email, planId, amount, 
      paymentMode, transactionId, paymentProofImage 
    } = req.body;
    
    const paymentStatus = "Pending";
    
    // createMemberService handles user creation, member creation, plan assignment, and payment insertion
    const memberResult = await createMemberService({
      adminId,
      fullName,
      email,
      phone,
      planId,
      amountPaid: amount,
      paymentMode,
      transactionId,
      paymentProofImage,
      paymentStatus
    });

    // Fire notification to Admin
    try {
      const io = getIO();
      if (io) {
        io.emit(`admin_${adminId}`, "new_payment_submitted", { message: "New payment pending verification from " + fullName });
      }
    } catch(e) {}
    
    res.json({ success: true, message: "Payment submitted successfully. Pending verification.", data: memberResult });
  } catch (err) {
    next(err);
  }
};

export const verifyManualPayment = async (req, res, next) => {
  try {
    const { paymentId, action, rejectionRemarks } = req.body; // action = "Approve" or "Reject"
    
    const newStatus = action === "Approve" ? "Approved" : "Rejected";
    
    await pool.query(
      "UPDATE payment SET status = ?, rejectionRemarks = ? WHERE id = ?",
      [newStatus, rejectionRemarks || null, paymentId]
    );
    
    res.json({ success: true, message: `Payment ${newStatus} successfully.` });
  } catch (err) {
    next(err);
  }
};
