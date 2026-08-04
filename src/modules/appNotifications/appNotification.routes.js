import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from "./appNotification.controller.js";

const router = Router();

// Get paginated notifications
router.get("/", verifyToken(["Superadmin", "Admin", "Manager", "Receptionist", "Staff", "Member"]), getUserNotifications);

// Get unread notification count
router.get("/unread-count", verifyToken(["Superadmin", "Admin", "Manager", "Receptionist", "Staff", "Member"]), getUnreadCount);

// Mark specific notification as read
router.patch("/:id/read", verifyToken(["Superadmin", "Admin", "Manager", "Receptionist", "Staff", "Member"]), markAsRead);

// Mark all notifications as read
router.patch("/read-all", verifyToken(["Superadmin", "Admin", "Manager", "Receptionist", "Staff", "Member"]), markAllAsRead);

// Delete a notification
router.delete("/:id", verifyToken(["Superadmin", "Admin", "Manager", "Receptionist", "Staff", "Member"]), deleteNotification);

export default router;
