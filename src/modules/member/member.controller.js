


import { uploadToCloudinary } from "../../config/cloudinary.js";
import { generateMemberTemplate } from "../../utils/templateGenerator.js";
import {
  createMemberService,
  deleteMemberService,
  getMembersByAdminAndGroupPlanService,
  getMembersByAdminAndPlan,
  getMembersByAdminIdService,
  getRenewalPreviewService,
  listMembersService,
  listPTBookingsService,
  memberDetailService,
  renewMembershipService,
  updateMemberService,
  updateMemberRenewalStatusService,
  getMembersByAdminAndGeneralMemberPlanService,
  importMembersService
} from "./member.service.js";

import { getIO } from "../../config/socket.js";

export const createMember = async (req, res, next) => {
  try {
    let payload = { ...req.body };

    // ✅ Parse planIds if it's a JSON string (from FormData)
    if (payload.planIds) {
      if (typeof payload.planIds === 'string') {
        try {
          // Handle both "[22,31,14]" and "22,31,14" formats
          let parsed = payload.planIds.trim();
          if (parsed.startsWith('[') && parsed.endsWith(']')) {
            payload.planIds = JSON.parse(parsed);
          } else if (parsed.includes(',')) {
            // Handle comma-separated string "22,31,14"
            payload.planIds = parsed.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          } else {
            // Single number string "22"
            payload.planIds = [parseInt(parsed)].filter(id => !isNaN(id));
          }
        } catch (e) {
          console.error('Error parsing planIds:', e, 'Raw value:', payload.planIds);
          payload.planIds = [];
        }
      }
      // If already array, ensure all are numbers
      if (Array.isArray(payload.planIds)) {
        payload.planIds = payload.planIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
      }
    }

    console.log('📋 Parsed planIds:', payload.planIds);

    // ✅ profile image upload (optional)
    if (req.files?.profileImage) {
      const imageUrl = await uploadToCloudinary(
        req.files.profileImage,
        "users/profile"
      );
      payload.profileImage = imageUrl;
    }

    const m = await createMemberService(payload);

    // ⚡ Realtime Socket Emission for Instant Dashboard Sync
    try {
      const io = getIO();
      if (io) {
        io.emit("dashboardStatsUpdated", { type: "MEMBER_CREATED", adminId: payload.adminId, memberId: m.id });
        io.emit("membershipCreated", { adminId: payload.adminId, memberId: m.id });
      }
    } catch (socErr) {
      console.warn("Socket emission notice:", socErr.message);
    }

    res.json({
      success: true,
      message: "Member created successfully",
      member: m,
    });
  } catch (err) {
    console.error('❌ Error creating member:', err);
    next(err);
  }
};

export const renewMembershipPlan = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { planId, paymentMode, amountPaid, transactionId } = req.body;

    if (!planId || !paymentMode || amountPaid === undefined) {
      return res.status(400).json({
        success: false,
        message: "planId, paymentMode and amountPaid required ",
      });
    }

    let paymentProofImage = null;
    if (req.files && req.files.paymentProofImage) {
      paymentProofImage = await uploadToCloudinary(req.files.paymentProofImage, "gym/payment-proofs");
    }

    const payload = { ...req.body, paymentProofImage, transactionId };
    const data = await renewMembershipService(memberId, payload);

    res.json({
      success: true,
      message: "Membership renewed successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};


export const listMembers = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";

    const data = await listMembersService(branchId, page, limit, search);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const getMembersByTrainerIdController = async (req, res, next) => {
  try {
    const trainerId = parseInt(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({ success: false, message: "trainerId is required" });
    }
    const { getMembersByTrainerIdService } = await import('./member.service.js');
    const members = await getMembersByTrainerIdService(trainerId);
    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
};

export const memberDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const member = await memberDetailService(id);
    res.json({ success: true, member });
  } catch (err) {
    next(err);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    let data = { ...req.body };

    // ✅ Parse planIds if it's a JSON string (from FormData)
    if (data.planIds) {
      if (typeof data.planIds === 'string') {
        try {
          let parsed = data.planIds.trim();
          if (parsed.startsWith('[') && parsed.endsWith(']')) {
            data.planIds = JSON.parse(parsed);
          } else if (parsed.includes(',')) {
            data.planIds = parsed.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          } else {
            data.planIds = [parseInt(parsed)].filter(id => !isNaN(id));
          }
        } catch (e) {
          console.error('Error parsing planIds in update:', e);
          data.planIds = [];
        }
      }
      if (Array.isArray(data.planIds)) {
        data.planIds = data.planIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
      }
    }

    console.log('📋 Update member planIds:', data.planIds);

    // ✅ profile image upload (optional)
    if (req.files?.profileImage) {
      const imageUrl = await uploadToCloudinary(
        req.files.profileImage,
        "users/profile"
      );
      data.profileImage = imageUrl;
    }

    const updated = await updateMemberService(id, data);

    res.json({
      success: true,
      message: "Member updated successfully",
      member: updated,
    });
  } catch (err) {
    console.error('❌ Error updating member:', err);
    next(err);
  }
};

export const deleteMember = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    await deleteMemberService(id);
    res.json({
      success: true,
      message: "Member deactivated successfully",
    });
  } catch (err) {
    next(err);
  }
};





export const getMembersByAdminId = async (req, res, next) => {
  try {
    const { adminId } = req.params; // URL: /members/admin/:adminId
    const members = await getMembersByAdminIdService(adminId);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

export const getRenewalPreview = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);

    if (!Number.isInteger(adminId)) {
      return res.status(400).json({
        success: false,
        message: "adminId must be a valid number",
      });
    }

    const data = await getRenewalPreviewService(adminId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMemberRenewalStatus = async (req, res, next) => {
  try {
    const memberId = Number(req.params.memberId);
    const { status, adminId } = req.body;

    if (!Number.isInteger(memberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid memberId",
      });
    }

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    if (!["Active", "Reject"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be either Active or Reject",
      });
    }

    const data = await updateMemberRenewalStatusService(
      memberId,
      adminId,
      status
    );

    return res.status(200).json({
      success: true,
      message: `Member renewal ${status} successfully`,
      data,
    });
  } catch (err) {
    next(err);
  }
};




export const listPTBookings = async (req, res, next) => {
  try {
    const branchId = req.params.branchId;
    const data = await listPTBookingsService(branchId);

    res.json({
      success: true,
      total: data.length,
      items: data
    });
  } catch (err) {
    next(err);
  }
};


export const getMembersByAdminAndPlanController = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({ success: false, message: "adminId is required" });
    }

    const members = await getMembersByAdminAndPlan(adminId);

    return res.json({ success: true, members });
  } catch (err) {
    next(err);
  }
};



export const getMembersByAdminAndGroupPlanController = async (req, res, next) => {
   try {
    // CHANGED: Extract both adminId and planId from request parameters
    const { adminId, planId } = req.params;
    
    // CHANGED: Validate that both IDs are present
    if (!adminId || !planId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and Plan ID are required"
      });
    }
    
    // CHANGED: Call the updated service with both IDs
    const result = await getMembersByAdminAndGroupPlanService(adminId, planId);
    
    res.json({
      success: true,
      message: "Members for the specified plan fetched successfully",
     data: {
        plan: result.plan,
        members: result.members,
        statistics: result.statistics,
        Total_Members: result.members.length
      }
    });
  } catch (error) {
    next(error);
  }
};


export const getMembersByAdminAndGeneralMemberPlanController = async (req, res, next) => {
  try {
    const { adminId, planId } = req.params;

    if (!adminId || !planId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and Plan ID are required"
      });
    }

    const result = await getMembersByAdminAndGeneralMemberPlanService(adminId, planId);

    res.json({
      success: true,
      message: "MemberShip plan members for trainerType general fetched successfully",
      data: {
        plan: result.plan,
        members: result.members,
        statistics: result.statistics,
        Total_Members: result.members.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /members/import
 * Upload an Excel/CSV file to bulk-import members
 */
export const importMembers = async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please upload an Excel (.xlsx) or CSV file.",
      });
    }

    const { adminId, branchId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const fileBuffer = req.files.file.data;
    const result = await importMembersService(adminId, branchId || null, fileBuffer);

    return res.status(200).json({
      success: true,
      message: `Import complete! ${result.successCount} member(s) added successfully.`,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      skippedList: result.skippedList,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * GET /members/import/template
 * Download the sample Excel template for member import
 */
export const downloadMemberTemplate = async (req, res, next) => {
  try {
    const buffer = generateMemberTemplate();
    res.setHeader("Content-Disposition", "attachment; filename=Member_Import_Template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

export const assignTrainerToMemberController = async (req, res, next) => {
  try {
    const { memberId, trainerId, trainerType } = req.body;

    if (!memberId || !trainerId) {
      return res.status(400).json({
        success: false,
        message: "memberId and trainerId are required",
      });
    }

    const { assignTrainerToMemberService } = await import('./member.service.js');
    const result = await assignTrainerToMemberService({ memberId, trainerId, trainerType });

    res.json({
      success: true,
      message: "Trainer assigned to member successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

// Live search members by name (for personal notification dropdown)
export const searchMembersController = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, members: [] });
    }

    // Get adminId from token if available, else from query
    const adminId = req.user?.adminId || req.user?.id || req.query.adminId;

    const { pool } = await import('../../config/db.js');
    const searchTerm = `%${q.trim()}%`;
    
    let query = `SELECT id, fullName, email, phone FROM member WHERE status = 'Active' AND fullName LIKE ?`;
    const params = [searchTerm];
    
    if (adminId) {
      query += ` AND adminId = ?`;
      params.push(adminId);
    }
    
    query += ` LIMIT ?`;
    params.push(parseInt(limit));

    const [members] = await pool.query(query, params);
    res.json({ success: true, members });
  } catch (err) {
    next(err);
  }
};
