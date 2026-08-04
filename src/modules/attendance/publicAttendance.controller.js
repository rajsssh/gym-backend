import { pool } from "../../config/db.js";
import { memberCheckIn, memberCheckOut } from "../memberattendence/memberattendence.controller.js";
import { staffCheckIn, staffCheckOut } from "../staffAttendance/staffAttendance.controller.js";

// --- MEMBER PUBLIC ATTENDANCE ---

export const publicMemberCheckIn = async (req, res, next) => {
  try {
    const adminId = req.body.adminId;
    const branchId = req.body.branchId;
    const identifier = req.body.identifier || req.body.phone;

    if (!identifier || !adminId) {
      return res.status(400).json({ success: false, message: "Email/Phone and Gym ID are required" });
    }

    // Find member by phone or email
    const [members] = await pool.query(
      `SELECT m.id, m.branchId 
       FROM member m 
       LEFT JOIN user u ON m.userId = u.id 
       WHERE m.adminId = ? AND (m.phone = ? OR m.email = ? OR u.phone = ? OR u.email = ?)`,
      [adminId, identifier, identifier, identifier, identifier]
    );

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: "Member not found with this email/phone in this gym." });
    }

    const member = members[0];

    // Prepare req.body for the actual memberCheckIn controller
    req.body.memberId = member.id;
    req.body.qrAdminId = adminId;
    req.body.branchId = member.branchId || branchId;
    req.body.mode = "QR";

    // Pass to existing controller
    return memberCheckIn(req, res, next);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const publicMemberCheckOut = async (req, res, next) => {
  try {
    const adminId = req.body.adminId;
    const branchId = req.body.branchId;
    const identifier = req.body.identifier || req.body.phone;

    if (!identifier || !adminId) {
      return res.status(400).json({ success: false, message: "Email/Phone and Gym ID are required" });
    }

    const [members] = await pool.query(
      `SELECT m.id, m.branchId 
       FROM member m 
       LEFT JOIN user u ON m.userId = u.id 
       WHERE m.adminId = ? AND (m.phone = ? OR m.email = ? OR u.phone = ? OR u.email = ?)`,
      [adminId, identifier, identifier, identifier, identifier]
    );

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: "Member not found with this email/phone in this gym." });
    }

    const member = members[0];

    // req.params.id is expected by memberCheckOut as the attendance record ID
    // Wait, memberCheckOut usually takes req.params.id (the attendance ID). 
    // Let's check how memberCheckOut actually works in memberattendence.controller.js
    // If it takes req.params.id, we must find the active attendance record first.
    
    const [active] = await pool.query(
      "SELECT id FROM memberattendance WHERE memberId = ? AND DATE(checkIn) = CURDATE() AND checkOut IS NULL ORDER BY id DESC LIMIT 1",
      [member.id]
    );

    if (active.length === 0) {
      return res.status(400).json({ success: false, message: "No active check-in found for today." });
    }

    req.params.id = active[0].id;
    req.body.mode = "QR";
    req.body.qrAdminId = adminId;
    req.body.memberId = member.id;

    return memberCheckOut(req, res, next);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// --- STAFF PUBLIC ATTENDANCE ---

export const publicStaffCheckIn = async (req, res, next) => {
  try {
    const adminId = req.body.adminId;
    const branchId = req.body.branchId;
    const identifier = req.body.identifier || req.body.phone;

    if (!identifier || !adminId) {
      return res.status(400).json({ success: false, message: "Email/Phone and Gym ID are required" });
    }

    // Find staff
    const [staffs] = await pool.query(
      `SELECT s.id, s.branchId 
       FROM staff s 
       LEFT JOIN user u ON s.userId = u.id 
       WHERE s.adminId = ? AND (u.phone = ? OR u.email = ?)`,
      [adminId, identifier, identifier]
    );

    if (staffs.length === 0) {
      return res.status(404).json({ success: false, message: "Staff not found with this email/phone in this gym." });
    }

    const staff = staffs[0];

    req.body.staffId = staff.id;
    req.body.qrAdminId = adminId;
    req.body.branchId = staff.branchId || branchId;
    req.body.mode = "QR";

    return staffCheckIn(req, res, next);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const publicStaffCheckOut = async (req, res, next) => {
  try {
    const adminId = req.body.adminId;
    const branchId = req.body.branchId;
    const identifier = req.body.identifier || req.body.phone;

    if (!identifier || !adminId) {
      return res.status(400).json({ success: false, message: "Email/Phone and Gym ID are required" });
    }

    const [staffs] = await pool.query(
      `SELECT s.id, s.branchId 
       FROM staff s 
       LEFT JOIN user u ON s.userId = u.id 
       WHERE s.adminId = ? AND (u.phone = ? OR u.email = ?)`,
      [adminId, identifier, identifier]
    );

    if (staffs.length === 0) {
      return res.status(404).json({ success: false, message: "Staff not found with this email/phone in this gym." });
    }

    const staff = staffs[0];

    // Find active attendance record
    const [active] = await pool.query(
      "SELECT id FROM staffattendance WHERE staffId = ? AND DATE(checkIn) = CURDATE() AND checkOut IS NULL ORDER BY id DESC LIMIT 1",
      [staff.id]
    );

    if (active.length === 0) {
      return res.status(400).json({ success: false, message: "No active check-in found for today." });
    }

    req.params.id = active[0].id;
    req.body.staffId = staff.id;
    req.body.qrAdminId = adminId;
    req.body.branchId = staff.branchId || branchId;
    req.body.mode = "QR";

    return staffCheckOut(req, res, next);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
