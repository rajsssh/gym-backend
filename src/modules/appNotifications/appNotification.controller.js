import * as appNotificationService from "./appNotification.service.js";

import { pool } from "../../config/db.js";

// Helper to get safe receiver ID and Role from JWT
const getIdentity = async (req) => {
  const isSuperAdmin = req.user.roleId === 1;
  let tenantId = isSuperAdmin ? req.user.id : (req.user.adminId || req.user.id);
  let receiverId = req.user.id;
  let receiverRole = req.user.role || (req.user.roleId === 1 ? 'Super Admin' : (req.user.roleId === 2 ? 'Admin' : (req.user.roleId === 4 ? 'Member' : 'Staff')));

  // If member, tenantId is their adminId. receiverId is their userId.
  if (receiverRole.toUpperCase() === 'MEMBER') {
    tenantId = req.user.adminId;
    receiverId = req.user.id; // userId from user table
  }

  return { tenantId, receiverId, receiverRole };
};

export const getUserNotifications = async (req, res, next) => {
  try {
    const { tenantId, receiverId, receiverRole } = await getIdentity(req);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const notifications = await appNotificationService.getUserNotifications(tenantId, receiverId, receiverRole, limit, offset);
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const { tenantId, receiverId, receiverRole } = await getIdentity(req);
    const count = await appNotificationService.getUnreadCount(tenantId, receiverId, receiverRole);
    res.json({ success: true, count });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { tenantId, receiverId } = await getIdentity(req);
    const { id } = req.params;
    await appNotificationService.markAsRead(id, tenantId, receiverId);
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const { tenantId, receiverId, receiverRole } = await getIdentity(req);
    await appNotificationService.markAllAsRead(tenantId, receiverId, receiverRole);
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { tenantId, receiverId } = await getIdentity(req);
    const { id } = req.params;
    await appNotificationService.deleteNotification(id, tenantId, receiverId);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
};
