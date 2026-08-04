import { 
  sendNotificationService, 
  getUserNotificationsService, 
  getAllUserNotificationsService,
  markAsReadService,
  broadcastAnnouncementService,
  getBroadcastHistoryService,
  adminBroadcastAnnouncementService,
  getAdminBroadcastHistoryService,
  getUserAnnouncementsService,
  sendPersonalNotificationService,
  getPersonalNotifHistoryService,
  deleteAnnouncementService,
  markAllAsReadService
} from "./notif.service.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import { pool } from "../../config/db.js";

export const sendNotification = async (req, res, next) => {
  try {
    const { memberId, type } = req.body;
    let tenantId = req.user?.roleId === 2 ? req.user.id : req.user?.adminId;

    if (memberId && (type === "IN_APP" || type === "IN-APP")) {
      const [member] = await pool.query('SELECT userId, adminId FROM member WHERE id = ?', [memberId]);
      if (!member.length) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }
      
      // Tenant Isolation
      if (req.user.roleId !== 1 && member[0].adminId !== tenantId) {
        return res.status(403).json({ success: false, message: 'Unauthorized to send message to this member' });
      }
      
      if (!member[0].userId) {
        return res.status(400).json({ success: false, message: 'Member has no associated user account' });
      }
      
      // Override 'to' with the correct userId
      req.body.to = member[0].userId.toString();
    }

    const log = await sendNotificationService({
      ...req.body,
      tenantId,
      senderId: req.user?.id,
    });

    // If email was skipped due to missing SMTP config, return 200 (not 500)
    if (log && log.skipped) {
      return res.json({ success: false, skipped: true, message: log.reason || 'Email skipped: SMTP not configured on server.' });
    }

    res.json({ success: true, log });
  } catch (err) {
    next(err);
  }
};

export const getUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const notifications = await getUserNotificationsService(userId);
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

export const getAllUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const notifications = await getAllUserNotificationsService(userId);
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await markAsReadService(id);
    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await markAllAsReadService(userId);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

export const broadcastAnnouncement = async (req, res, next) => {
  try {
    let { subject, message, channels, targetRoles } = req.body;
    
    if (!subject || !message || !channels) {
      return res.status(400).json({
        success: false,
        message: "subject, message, and channels are required",
      });
    }

    // Parse JSON strings if sent via FormData
    let parsedChannels = channels;
    if (typeof channels === 'string') {
      try { parsedChannels = JSON.parse(channels); } catch (e) {}
    }
    let parsedTargetRoles = targetRoles;
    if (typeof targetRoles === 'string') {
      try { parsedTargetRoles = JSON.parse(targetRoles); } catch (e) {}
    }

    let imageUrl = null;
    if (req.files && (req.files.image || req.files.file || req.files.attachment)) {
      const fileToUpload = req.files.image || req.files.file || req.files.attachment;
      imageUrl = await uploadToCloudinary(fileToUpload, 'announcements');
    }

    const result = await broadcastAnnouncementService({
      subject,
      message,
      channels: parsedChannels,
      targetRoles: parsedTargetRoles || [2], // Default to Admin/Owner
      sentBy: req.user?.id || null,
      imageUrl
    });

    res.json({
      success: true,
      message: "Announcement broadcasted successfully",
      result
    });
  } catch (err) {
    next(err);
  }
};

export const getBroadcastHistory = async (req, res, next) => {
  try {
    const history = await getBroadcastHistoryService();
    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

export const adminBroadcastAnnouncement = async (req, res, next) => {
  try {
    let { subject, message, channels, targetAudience } = req.body;
    
    if (!subject || !message || !channels || !targetAudience) {
      return res.status(400).json({
        success: false,
        message: "subject, message, channels, and targetAudience are required",
      });
    }

    // Parse JSON strings if sent via FormData
    if (typeof channels === 'string') channels = JSON.parse(channels);
    if (typeof targetAudience === 'string') targetAudience = JSON.parse(targetAudience);

    let imageUrl = null;
    if (req.files && req.files.image) {
      imageUrl = await uploadToCloudinary(req.files.image, 'announcements');
    }

    const branchId = req.user.branchId;
    const adminId = req.user.roleId === 2 ? req.user.id : req.user.adminId;

    const result = await adminBroadcastAnnouncementService({
      subject,
      message,
      channels,
      targetAudience, // e.g. ["MEMBERS", "STAFF"]
      sentBy: req.user.id,
      branchId,
      adminId,
      imageUrl
    });

    res.json({ success: true, message: "Announcement broadcasted successfully", result });
  } catch (err) {
    next(err);
  }
};

export const getAdminBroadcastHistory = async (req, res, next) => {
  try {
    const adminId = req.user.roleId === 2 ? req.user.id : req.user.adminId;
    const history = await getAdminBroadcastHistoryService(adminId);
    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
};
export const getUserAnnouncements = async (req, res, next) => {
  try {
    const branchId = req.user.branchId;
    const adminId = req.user.roleId === 2 ? req.user.id : req.user.adminId;
    
    // We can pass roleGroup 'MEMBERS' or 'STAFF' as a query param.
    const roleGroup = req.query.roleGroup || 'MEMBERS';

    const announcements = await getUserAnnouncementsService(adminId, branchId, roleGroup);
    res.json({ success: true, announcements });
  } catch (err) {
    next(err);
  }
};

export const sendPersonalNotification = async (req, res, next) => {
  try {
    const { memberId, category, message } = req.body;
    
    if (!memberId || !category || !message) {
      return res.status(400).json({
        success: false,
        message: "memberId, category, and message are required"
      });
    }

    const result = await sendPersonalNotificationService({
      memberId: parseInt(memberId),
      category,
      message,
      sentBy: req.user.id
    });

    res.json({ success: true, message: `Notification sent to ${result.memberName}`, result });
  } catch (err) {
    next(err);
  }
};

export const getPersonalHistory = async (req, res, next) => {
  try {
    const adminId = req.user.roleId === 2 ? req.user.id : req.user.adminId;
    const history = await getPersonalNotifHistoryService(adminId);
    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user.roleId === 1;
    const adminId = isSuperAdmin ? null : (req.user.roleId === 2 ? req.user.id : req.user.adminId);
    
    await deleteAnnouncementService(id, adminId);
    res.json({ success: true, message: "Announcement deleted successfully" });
  } catch (err) {
    next(err);
  }
};
