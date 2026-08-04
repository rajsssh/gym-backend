import { pool } from "../../config/db.js";
import { emitToUser } from "../../config/socket.js";

/**
 * Creates a new application notification, saves it to the database, and emits it via Socket.io.
 */
export const createAppNotification = async ({
  tenantId,
  senderId = null,
  receiverId,
  receiverRole,
  type,
  title,
  message,
  referenceType = null,
  referenceId = null,
  actionUrl = null,
  metadata = null,
  priority = "NORMAL",
}) => {
  if (!tenantId || !receiverId || !receiverRole || !type || !title || !message) {
    throw new Error("Missing required fields for app notification");
  }

  const metaStr = metadata ? JSON.stringify(metadata) : null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Tenant Validation
    const [[user]] = await connection.query("SELECT id, roleId, adminId FROM user WHERE id = ?", [receiverId]);
    if (!user) {
      throw new Error("Receiver does not exist");
    }
    
    const expectedTenantId = Number(user.roleId) === 1 ? user.id : (user.adminId || user.id);
    if (Number(tenantId) !== Number(expectedTenantId) && Number(user.roleId) !== 1) { 
      // Note: If user is SuperAdmin (role=1) receiving from System, tenantId might be System
      // We log but do not strictly block if tenantId mismatch occurs for SuperAdmin.
      if (Number(user.roleId) !== 1) {
        throw new Error(`Tenant mismatch. Expected ${expectedTenantId}, got ${tenantId}`);
      }
    }

    // 2. Duplicate Check
    const [existing] = await connection.query(`
      SELECT id FROM app_notification 
      WHERE type = ? AND receiverId = ? AND referenceType <=> ? AND referenceId <=> ? 
      AND createdAt > NOW() - INTERVAL 5 MINUTE
      LIMIT 1
    `, [type, receiverId, referenceType, referenceId]);
    
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return null; // Silently skip duplicate
    }

    // 3. Insert Notification
    const sql = `
      INSERT INTO app_notification (
        tenantId, senderId, receiverId, receiverRole, type, title, message,
        referenceType, referenceId, actionUrl, metadata, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.query(sql, [
      tenantId, senderId, receiverId, receiverRole, type, title, message,
      referenceType, referenceId, actionUrl, metaStr, priority
    ]);
    const notificationId = result.insertId;

    // 4. Delivery Log (CREATED)
    await connection.query(
      `INSERT INTO notification_delivery_log (notificationId, tenantId, receiverId, status) VALUES (?, ?, ?, 'CREATED')`,
      [notificationId, tenantId, receiverId]
    );

    await connection.commit();

    const newNotification = {
      id: notificationId,
      tenantId,
      senderId,
      receiverId,
      receiverRole,
      type,
      title,
      message,
      referenceType,
      referenceId,
      actionUrl,
      metadata,
      priority,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString()
    };

    // 5. Emit Real-time Notification
    try {
      emitToUser(receiverId.toString(), "new_notification", newNotification);
      await pool.query("UPDATE notification_delivery_log SET status = 'SOCKET_SENT' WHERE notificationId = ?", [notificationId]);
    } catch (sockErr) {
      console.warn("Socket emit failed:", sockErr);
      await pool.query("UPDATE notification_delivery_log SET status = 'FAILED', errorReason = ? WHERE notificationId = ?", [sockErr.message, notificationId]);
    }

    connection.release();
    return newNotification;

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error("Failed to create app notification:", error);
    throw error;
  }
};

/**
 * Fetch paginated user notifications, safely scoped by tenant and receiver ID/Role.
 */
export const getUserNotifications = async (tenantId, receiverId, receiverRole, limit = 20, offset = 0) => {
  // NOTE: We do NOT filter by receiverRole here because the stored role at creation time
  // may differ from the role derived from the JWT at fetch time (e.g. 'Trainer' vs 'Staff').
  // receiverId is unique per user, so tenantId + receiverId is sufficient.
  const sql = `
    SELECT * FROM app_notification
    WHERE tenantId = ? AND receiverId = ?
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query(sql, [tenantId, receiverId, parseInt(limit), parseInt(offset)]);
  return rows.map(r => ({
    ...r,
    metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null
  }));
};


/**
 * Get unread count for a user.
 */
export const getUnreadCount = async (tenantId, receiverId, receiverRole) => {
  // NOTE: Same as getUserNotifications — do not filter by receiverRole to avoid role mismatch.
  const sql = `
    SELECT COUNT(*) as count FROM app_notification
    WHERE tenantId = ? AND receiverId = ? AND isRead = FALSE
  `;
  const [rows] = await pool.query(sql, [tenantId, receiverId]);
  return rows[0].count;
};


/**
 * Mark a specific notification as read.
 */
export const markAsRead = async (id, tenantId, receiverId) => {
  const sql = `
    UPDATE app_notification 
    SET isRead = TRUE, readAt = NOW() 
    WHERE id = ? AND tenantId = ? AND receiverId = ?
  `;
  const [result] = await pool.query(sql, [id, tenantId, receiverId]);
  
  if (result.affectedRows > 0) {
    emitToUser(receiverId.toString(), "notification_read", { id: parseInt(id) });
  }
  return result.affectedRows > 0;
};

/**
 * Mark all notifications as read for a user.
 */
export const markAllAsRead = async (tenantId, receiverId, receiverRole) => {
  const sql = `
    UPDATE app_notification 
    SET isRead = TRUE, readAt = NOW() 
    WHERE tenantId = ? AND receiverId = ? AND isRead = FALSE
  `;
  const [result] = await pool.query(sql, [tenantId, receiverId]);
  
  if (result.affectedRows > 0) {
    emitToUser(receiverId.toString(), "all_notifications_read", {});
  }
  return result.affectedRows;
};

/**
 * Delete a notification.
 */
export const deleteNotification = async (id, tenantId, receiverId) => {
  const sql = `
    DELETE FROM app_notification 
    WHERE id = ? AND tenantId = ? AND receiverId = ?
  `;
  const [result] = await pool.query(sql, [id, tenantId, receiverId]);
  return result.affectedRows > 0;
};
