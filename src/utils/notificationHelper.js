import { pool } from "../config/db.js";
import { getIO, emitToUser } from "../config/socket.js";
import { formatISTDate } from "./dateHelper.js";
import { createAppNotification } from "../modules/appNotifications/appNotification.service.js";
import { dispatchNotification } from "./notificationDispatcher.js";

export const sendAppNotification = async (to, message, options = {}) => {
  try {
    const {
      title = null,
      receiver_role = null,
      sender_id = null,
      sender_role = null,
      reference_type = null,
      reference_id = null
    } = options;

    if (to === "all") {
      // Just emit via socket for now if it's a global broadcast to all without persistence
      const io = getIO();
      if (io) {
        io.emit("new_notification", { type: "IN-APP", message, title, createdAt: new Date().toISOString() });
      }
      return;
    }

    // Lookup user to get tenantId and precise role
    const [[user]] = await pool.query("SELECT id, roleId, adminId, email FROM user WHERE id = ?", [to]);
    if (user) {
      let roleName = 'Member';
      if (user.roleId === 1) roleName = 'Super Admin';
      else if (user.roleId === 2) roleName = 'Admin';
      else if (user.roleId === 3) roleName = 'Trainer';
      else if (user.roleId === 4) roleName = 'Staff';

      const tenantId = user.roleId === 1 ? user.id : (user.adminId || user.id);

      await createAppNotification({
        tenantId,
        senderId: sender_id,
        receiverId: user.id,
        receiverRole: receiver_role || roleName,
        type: title || 'SYSTEM',
        title: title || 'Notification',
        message: message,
        referenceType: reference_type,
        referenceId: reference_id ? reference_id.toString() : null
      });

      if (user.email) {
        await dispatchNotification({
          category: "app_notification",
          toEmail: user.email,
          toUserId: user.id,
          subject: title || 'Gym Notification',
          message: message,
          isSystemEvent: false,
          adminIdForCredits: tenantId
        });
      }
    }

  } catch (err) {
    console.error("Failed to send app notification:", err);
  }
};

export const notifyAdminAndStaff = async (adminId, message, options = {}) => {
  try {
    const {
      title = "Notification",
      sender_id = null,
      sender_role = null,
      reference_type = null,
      reference_id = null
    } = options;

    if (!adminId) return;

    // Lookup Admin and all their staff (excluding members, roleId=4)
    // roleId=1 is Super Admin, usually excluded from tenant staff unless they are the admin.
    const [users] = await pool.query(
      `SELECT id, roleId, adminId, fullName, email FROM user 
       WHERE (id = ? OR adminId = ?) 
       AND roleId != 4 AND roleId != 1`,
      [adminId, adminId]
    );

    for (const u of users) {
      let roleName = 'Staff';
      if (u.roleId === 2) roleName = 'Admin';
      else if (u.roleId === 3 || u.roleId === 5 || u.roleId === 6) roleName = 'Trainer';
      else if (u.roleId === 7) roleName = 'Receptionist';
      else if (u.roleId === 8) roleName = 'Manager';

      await createAppNotification({
        tenantId: adminId,
        senderId: sender_id,
        receiverId: u.id,
        receiverRole: roleName,
        type: title,
        title: title,
        message: message,
        referenceType: reference_type,
        referenceId: reference_id ? reference_id.toString() : null
      });

      if (u.email) {
        await dispatchNotification({
          category: "app_notification",
          toEmail: u.email,
          toUserId: u.id,
          subject: title || 'Gym Notification',
          message: message,
          isSystemEvent: false,
          adminIdForCredits: adminId
        });
      }
    }

  } catch (err) {
    console.error("Failed to notify admin and staff:", err);
  }
};
