import { pool } from "../config/db.js";
import { getIO, emitToUser } from "../config/socket.js";

/**
 * Logs an admin activity into the admin_activity_logs table
 */
export const logAdminActivity = async (adminId, actionType, description, referenceId = null) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO admin_activity_logs (admin_id, action_type, description, reference_id) VALUES (?, ?, ?, ?)`,
      [adminId, actionType, description, referenceId]
    );

    // Optionally emit to Admin dashboard for real-time activity feed
    const io = getIO();
    if (io) {
      const payload = {
        id: result.insertId,
        admin_id: adminId,
        action_type: actionType,
        description,
        reference_id: referenceId,
        createdAt: new Date().toISOString()
      };
      
      emitToUser(adminId, "new_admin_activity", payload);
    }
  } catch (err) {
    console.error("Failed to log admin activity:", err);
  }
};
