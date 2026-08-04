import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.js";
import { 
  sendNotification, 
  getUserNotifications, 
  getAllUserNotifications,
  markAsRead,
  markAllAsRead,
  broadcastAnnouncement,
  getBroadcastHistory,
  adminBroadcastAnnouncement,
  getAdminBroadcastHistory,
  getUserAnnouncements,
  sendPersonalNotification,
  getPersonalHistory,
  deleteAnnouncement
} from "./notif.controller.js";

const router = Router();

router.post(
  "/send",
  verifyToken(["Admin", "Superadmin", "Staff"]),
  sendNotification
);

router.get(
  "/user/:userId",
  getUserNotifications
);

router.get(
  "/user/:userId/all",
  getAllUserNotifications
);

router.put(
  "/read/:id",
  markAsRead
);

router.put(
  "/read-all/:userId",
  markAllAsRead
);

// --- Broadcast Routes for Super Admin ---
router.post(
  "/broadcast",
  verifyToken(["Superadmin", "Subadmin"]),
  broadcastAnnouncement
);

router.get(
  "/broadcast/history",
  verifyToken(["Superadmin", "Subadmin"]),
  getBroadcastHistory
);

// --- Broadcast Routes for Admin / Managers ---
router.post(
  "/admin/broadcast",
  verifyToken(["Admin", "Superadmin", "Manager"]),
  adminBroadcastAnnouncement
);

router.get(
  "/admin/broadcast/history",
  verifyToken(["Admin", "Superadmin", "Manager", "Receptionist", "Sales Agent", "Staff"]),
  getAdminBroadcastHistory
);

router.get(
  "/user-announcements",
  verifyToken(),
  getUserAnnouncements
);

// --- Personal Notification: Admin → Individual Member ---
router.post(
  "/personal",
  verifyToken(["Admin", "Superadmin", "Manager"]),
  sendPersonalNotification
);

router.get(
  "/personal/history",
  verifyToken(["Admin", "Superadmin", "Manager"]),
  getPersonalHistory
);

router.delete(
  "/announcement/:id",
  verifyToken(["Admin", "Superadmin", "Manager"]),
  deleteAnnouncement
);

// --- Test Notification (Email / WhatsApp) ---
router.post(
  "/test",
  verifyToken(["Admin", "Superadmin"]),
  async (req, res, next) => {
    try {
      const { type, to } = req.body;
      if (!type || !to) {
        return res.status(400).json({ success: false, message: "type and to are required" });
      }
      const { sendNotificationService } = await import("./notif.service.js");
      const result = await sendNotificationService({
        type,
        to,
        message: `✅ Test notification from GymSoft Gym Software!\n\nThis is a test ${type} message sent at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
        subject: "GymSoft — Test Notification",
      });
      res.json({ success: true, message: `Test ${type} dispatched successfully`, result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
