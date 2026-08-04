import { pool } from "../../config/db.js";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";
import { getIO, emitToUser } from "../../config/socket.js";
import { sendAppNotification } from "../../utils/notificationHelper.js";
import { sendTemplatedNotification } from "../messageTemplates/messageTemplate.service.js";

// ➤ Create Session
// export const createSessionService = async (data) => {
//   const { sessionName, trainerId, branchId, date, time, duration, description, status } = data;

//   const [result] = await pool.query(
//     `INSERT INTO session 
//      (sessionName, trainerId, branchId, date, time, duration, description, status)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//     [sessionName, Number(trainerId), Number(branchId), new Date(date), time, Number(duration), description, status || "Upcoming"]
//   );

//   const sessionId = result.insertId;
//   const [session] = await pool.query(`SELECT * FROM session WHERE id = ?`, [sessionId]);
//   return session[0];
// };
export const createSessionService = async (data) => {
  const {
    sessionName,
    trainerId,
    adminId,      // ✅ REQUIRED
    date,
    time,
    duration,
    description,
    status,
    capacity
  } = data;

  if (!adminId) {
    throw { status: 400, message: "adminId is required" };
  }

  

  const [result] = await pool.query(
    `INSERT INTO session 
     (sessionName, trainerId, adminId, date, time, duration, description, status, capacity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionName,
      Number(trainerId),
      Number(adminId),
      date,
      time,
      Number(duration),
      description || null,
      status || "Upcoming",
      capacity ? Number(capacity) : 20
    ]
  );
  

  const sessionId = result.insertId;

  const [session] = await pool.query(
    `SELECT * FROM session WHERE id = ?`,
    [sessionId]
  );

  /* INSERT NOTIFICATIONS & SOCKET EVENT */
  try {
    // 1. Alert for Trainer
    const trainerMsg = `You have been assigned to a new session: ${sessionName} | Date: ${date} | Time: ${time} | Capacity: ${capacity}`;
    await sendAppNotification(trainerId, trainerMsg, {
      title: "New Session Assigned",
      receiver_role: "Trainer",
      sender_id: adminId,
      sender_role: "Admin",
      reference_type: "SESSION",
      reference_id: sessionId
    });

    // 2. Alert for Members (Broadcast to branch/all)
    const [trainerRow] = await pool.query("SELECT fullName FROM user WHERE id = ?", [trainerId]);
    const trainerName = trainerRow.length > 0 ? trainerRow[0].fullName : "a trainer";
    const broadcastMsg = `New Session Available: ${sessionName} | Trainer: ${trainerName} | Date: ${date} | Time: ${time}`;
    await sendAppNotification("all", broadcastMsg, {
      title: "New Session Available",
      receiver_role: "Member",
      sender_id: adminId,
      sender_role: "Admin",
      reference_type: "SESSION",
      reference_id: sessionId
    });

    // 3. Log Admin Activity
    import("../../utils/activityHelper.js").then(({ logAdminActivity }) => {
      logAdminActivity(adminId, "CREATE_SESSION", `Created new session: ${sessionName}`, sessionId);
    });

    // 3. Emit Socket Event
    const io = getIO();
    if (io) {
      io.emit("sessionCreated", { sessionName, trainerId, date, time });
    }
  } catch (err) {
    console.error("Failed to insert session assignment alert/sockets:", err);
  }

  return session[0];
};
export const listSessionsService = async ({ adminId, trainerId, search }) => {
  if (!adminId && !trainerId) {
    throw {
      status: 400,
      message: "adminId or trainerId is required",
    };
  }

  let conditions = [];
  let values = [];

  if (adminId) {
    conditions.push("s.adminId = ?");
    values.push(adminId);
  }

  if (trainerId) {
    conditions.push("s.trainerId = ?");
    values.push(trainerId);
  }

  // 🔍 Search
  conditions.push("s.sessionName LIKE ?");
  values.push(`%${search || ""}%`);

  const whereClause = conditions.join(" AND ");

  const [rows] = await pool.query(
    `
    SELECT 
      s.*,
      t.id AS trainerId,
      t.fullName AS trainerName,
      (SELECT COUNT(*) FROM unified_bookings ub WHERE ub.sessionId = s.id AND ub.bookingStatus != 'Cancelled') AS joinedCount
    FROM session s
    LEFT JOIN user t ON s.trainerId = t.id
    WHERE ${whereClause}
    ORDER BY 
      FIELD(s.status, 'Upcoming', 'Ongoing', 'Completed') ASC,
      s.date ASC,
      s.time ASC
    `,
    values
  );

  return rows;
};


// ➤ Update complete session
export const updateSessionService = async (sessionId, data) => {
  const { sessionName, trainerId, branchId, date, time, duration, description, status, capacity } = data;

  const [existingRows] = await pool.query("SELECT * FROM session WHERE id = ?", [sessionId]);
  const exists = existingRows[0];
  if (!exists) throw { status: 404, message: "Session not found" };

  await pool.query(
    `UPDATE session 
     SET sessionName = ?, trainerId = ?, branchId = ?, date = ?, time = ?, duration = ?, description = ?, status = ?, capacity = ?
     WHERE id = ?`,
    [sessionName, Number(trainerId), Number(branchId), new Date(date), time, Number(duration), description, status, capacity ? Number(capacity) : 20, sessionId]
  );

  const [updated] = await pool.query(`SELECT * FROM session WHERE id = ?`, [sessionId]);

  /* INSERT NOTIFICATIONS & SOCKET EVENT */
  try {
    const io = getIO();
    const bid = exists.branchId || null;

    if (Number(trainerId) && Number(trainerId) !== exists.trainerId) {
      // Trainer Changed
      const oldTrainerMsg = `You have been removed from session: ${exists.sessionName}`;
      await sendAppNotification(exists.trainerId, oldTrainerMsg);
      
      const newTrainerMsg = `You have been assigned to session: ${sessionName}`;
      await sendAppNotification(trainerId, newTrainerMsg);
      
      if (io) {
        io.emit("trainerAssigned", { sessionId, oldTrainerId: exists.trainerId, newTrainerId: trainerId });
      }
    } else {
      // Updated
      const trainerMsg = `Session Updated: ${sessionName}`;
      await sendAppNotification(exists.trainerId, trainerMsg);
    }
    
    // Notify Booked Members
    const [bookings] = await pool.query(
      `SELECT m.userId FROM unified_bookings ub JOIN member m ON ub.memberId = m.id WHERE ub.sessionId = ? AND ub.bookingStatus = 'Booked'`,
      [sessionId]
    );
    for (const b of bookings) {
      if (b.userId) {
        await sendAppNotification(b.userId, `Your booked session ${sessionName} has been updated.`);
      }
    }

    if (capacity !== undefined && capacity !== exists.capacity) {
      if (io) io.emit("capacityUpdated", { sessionId, newCapacity: capacity });
    }
  } catch (err) {
    console.error("Failed to process session update notifications/sockets:", err);
  }

  return updated[0];
};

// ➤ Update only status
export const updateSessionStatusService = async (sessionId, status) => {
  await pool.query(`UPDATE session SET status = ? WHERE id = ?`, [status, sessionId]);
  const [updated] = await pool.query(`SELECT * FROM session WHERE id = ?`, [sessionId]);
  return updated[0];
};

// ➤ Delete session
export const deleteSessionService = async (sessionId) => {
  const [existingRows] = await pool.query("SELECT * FROM session WHERE id = ?", [sessionId]);
  const exists = existingRows[0];
  if (!exists) throw { status: 404, message: "Session not found" };

  await pool.query(`DELETE FROM pt_bookings WHERE sessionId = ?`, [sessionId]);
  await pool.query(`DELETE FROM unified_bookings WHERE sessionId = ?`, [sessionId]);

  /* INSERT NOTIFICATIONS & SOCKET EVENT */
  try {
    const io = getIO();
    
    // Notify Trainer
    const cancelMsg = `Assigned session cancelled: ${exists.sessionName}`;
    await sendAppNotification(exists.trainerId, cancelMsg, {
      title: "Session Cancelled",
      receiver_role: "Trainer",
      sender_id: exists.adminId,
      sender_role: "Admin",
      reference_type: "SESSION",
      reference_id: sessionId
    });
    
    // Notify Booked Members
    const [bookings] = await pool.query(
      `SELECT m.userId FROM unified_bookings ub JOIN member m ON ub.memberId = m.id WHERE ub.sessionId = ? AND ub.bookingStatus = 'Booked'`,
      [sessionId]
    );
    for (const b of bookings) {
      if (b.userId) {
        await sendAppNotification(b.userId, `Booked session cancelled: ${exists.sessionName}`, {
          title: "Session Cancelled",
          receiver_role: "Member",
          sender_id: exists.adminId,
          sender_role: "System",
          reference_type: "SESSION",
          reference_id: sessionId
        });
      }
    }

    // Log Admin Activity
    import("../../utils/activityHelper.js").then(({ logAdminActivity }) => {
      logAdminActivity(exists.adminId, "DELETE_SESSION", `Deleted session: ${exists.sessionName}`, sessionId);
    });

    if (io) {
      io.emit("sessionCancelled", { sessionId });
    }
  } catch (err) {
    console.error("Failed to process delete notifications/sockets:", err);
  }

  await pool.query(`DELETE FROM session WHERE id = ?`, [sessionId]);
  return true;
};

// ➤ Get Sessions for Member
export const getMemberSessionsService = async (memberId) => {
  // First get the member's adminId
  const [memberRows] = await pool.query(`SELECT adminId FROM member WHERE id = ?`, [memberId]);
  if (!memberRows.length) throw { status: 404, message: "Member not found" };
  const adminId = memberRows[0].adminId;

  // List upcoming sessions for this admin, and compute joined count and isJoined boolean
  const [sessions] = await pool.query(
    `SELECT 
      s.*,
      t.fullName AS trainerName,
      (SELECT COUNT(*) FROM unified_bookings ub WHERE ub.sessionId = s.id AND ub.bookingStatus != 'Cancelled') AS joinedCount,
      (SELECT COUNT(*) > 0 FROM unified_bookings ub2 WHERE ub2.sessionId = s.id AND ub2.memberId = ? AND ub2.bookingStatus != 'Cancelled') AS isJoined
     FROM session s
     LEFT JOIN user t ON s.trainerId = t.id
     WHERE s.adminId = ? AND s.status = 'Upcoming'
     ORDER BY s.date ASC, s.time ASC`,
    [memberId, adminId]
  );

  return sessions;
};

// ➤ Join Session (Member)
export const joinSessionService = async (memberId, sessionId) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // Check session exists and lock row
    const [sessionRows] = await connection.query(`SELECT * FROM session WHERE id = ? FOR UPDATE`, [sessionId]);
    if (!sessionRows.length) throw { status: 404, message: "Session not found" };
    const session = sessionRows[0];

    // Check if already joined
    const [existing] = await connection.query(
      `SELECT id FROM unified_bookings WHERE sessionId = ? AND memberId = ? AND bookingStatus != 'Cancelled'`,
      [sessionId, memberId]
    );
    if (existing.length > 0) throw { status: 400, message: "You have already joined this session" };

    // Check capacity
    const [countRows] = await connection.query(
      `SELECT COUNT(*) AS count FROM unified_bookings WHERE sessionId = ? AND bookingStatus != 'Cancelled'`,
      [sessionId]
    );
    const currentCount = countRows[0].count;
    if (currentCount >= (session.capacity || 20)) {
      throw { status: 400, message: "Session is full" };
    }

    // Calculate endTime
    let endTime = session.time;
    if (session.time && session.duration) {
      const [hours, minutes] = session.time.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + session.duration;
      const endHours = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
      const endMins = String(totalMinutes % 60).padStart(2, '0');
      endTime = `${endHours}:${endMins}`;
    }

    // Join the session
    await connection.query(
      `INSERT INTO unified_bookings 
       (memberId, trainerId, sessionId, date, startTime, endTime, bookingType, bookingStatus, paymentStatus, branchId)
       VALUES (?, ?, ?, ?, ?, ?, 'GROUP', 'Booked', 'Pending', ?)`,
      [memberId, session.trainerId, sessionId, session.date, session.time, endTime, session.branchId || null]
    );

    await connection.commit();
    connection.release();

    try {
      const [mRows] = await pool.query("SELECT id, userId, fullName, email, phone, branchId FROM member WHERE id = ?", [memberId]);
      if (mRows.length > 0) {
        const member = mRows[0];
        const sessDate = session.date ? new Date(session.date).toLocaleDateString() : '';
        try {
          const io = getIO();
          const memberUserId = member.userId;
          const sessionName = session.sessionName;

          // Member
          if (memberUserId) {
            await sendTemplatedNotification({
              eventKey: 'CLASS_BOOKED',
              tenantId: session.adminId || null,
              receiverId: memberUserId,
              receiverRole: 'Member',
              receiverEmail: member.email,
              receiverPhone: member.phone,
              variables: {
                Name: member.fullName,
                ClassName: sessionName,
                Date: sessDate + ' at ' + session.time
              },
              referenceType: 'SESSION',
              referenceId: sessionId.toString(),
              actionUrl: '/member-dashboard'
            });
          }

          // Trainer
          await sendTemplatedNotification({
            eventKey: 'CLASS_BOOKED',
            tenantId: session.adminId || null,
            receiverId: session.trainerId,
            receiverRole: 'Trainer',
            receiverEmail: null,
            receiverPhone: null,
            variables: {
              Name: 'Trainer',
              ClassName: sessionName,
              Date: sessDate + ' at ' + session.time
            },
            referenceType: 'SESSION',
            referenceId: sessionId.toString(),
            actionUrl: '/trainer-dashboard'
          });

          // Admin
          if (session.adminId) {
            await sendTemplatedNotification({
              eventKey: 'CLASS_BOOKED',
              tenantId: session.adminId,
              receiverId: session.adminId,
              receiverRole: 'Admin',
              receiverEmail: null,
              receiverPhone: null,
              variables: {
                Name: 'Admin',
                ClassName: sessionName,
                Date: sessDate + ' at ' + session.time
              },
              referenceType: 'SESSION',
              referenceId: sessionId.toString(),
              actionUrl: '/dashboard/classes'
            });
          }

          if (io) {
            io.emit("bookingCreated", { sessionId, classId: sessionId });
          }
        } catch (err) {
          console.error("Failed to process session booking notifications/sockets:", err);
        }
      }
    } catch (err) {
      console.error("Failed to fetch member for session notification:", err);
    }

    return { message: "Successfully joined session" };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

// ➤ Get members joined in a session
export const getSessionMembersService = async (sessionId) => {
  const [members] = await pool.query(
    `SELECT 
      m.id, m.fullName, m.phone, m.email, ub.bookingStatus, ub.createdAt
     FROM unified_bookings ub
     JOIN member m ON ub.memberId = m.id
     WHERE ub.sessionId = ? AND ub.bookingStatus != 'Cancelled'
     ORDER BY ub.createdAt DESC`,
    [sessionId]
  );
  return members;
};

