import { pool } from "../../config/db.js";
import { getIO, emitToUser } from "../../config/socket.js";
import { sendAppNotification } from "../../utils/notificationHelper.js";/**************************************
 * CLASS TYPES
 **************************************/
export const createClassTypeService = async (name) => {
  const [result] = await pool.query("INSERT INTO classtype (name) VALUES (?)", [
    name,
  ]);
};

export const getTrainersService = async () => {
  const [rows] = await pool.query(
    `SELECT 
        u.id,
        u.fullName,
        u.email,
        u.phone,
        u.branchId,
        u.roleId
     FROM user u
     JOIN role r ON u.roleId = r.id
     WHERE r.name = 'Trainer'`
  );

  return rows;
};

export const listClassTypesService = async () => {
  const [rows] = await pool.query("SELECT * FROM classtype ORDER BY id DESC");
  return rows;
};

/**************************************
 * CLASS SCHEDULE
 **************************************/
export const createScheduleService = async (data) => {
  const {
    adminId,
    className,
    trainerId,
    date,
    day,
    startTime,
    endTime,
    capacity,
    status = "Active",
    members = [],
    price = 0,
  } = data;

  /* BASIC VALIDATIONS */
  if (!adminId) throw { status: 400, message: "Admin is required" };
  if (!className) throw { status: 400, message: "Class name is required" };
  if (!trainerId) throw { status: 400, message: "Trainer is required" };
  if (!date) throw { status: 400, message: "Date is required" };
  if (!startTime || !endTime)
    throw { status: 400, message: "Start & End time required" };
  if (!capacity) throw { status: 400, message: "Capacity is required" };

  /* INSERT */
  const [result] = await pool.query(
    `INSERT INTO classschedule
      (adminId, className, trainerId, date, day, startTime, endTime, capacity, status, members, price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId, // ✅ NULL allowed
      className,
      trainerId,
      date,
      day,
      startTime,
      endTime,
      capacity,
      status,
      JSON.stringify(members),
      price,
    ]
  );

  /* INSERT NOTIFICATIONS & SOCKET EVENT */
  try {
    // 1. Alert for Trainer
    const trainerMsg = `You have been assigned to a new class: ${className} | Date: ${date} | Time: ${startTime} | Capacity: ${capacity}`;
    await sendAppNotification(trainerId, trainerMsg, {
      title: "New Class Assigned",
      receiver_role: "Trainer",
      sender_id: adminId,
      sender_role: "Admin",
      reference_type: "CLASS",
      reference_id: result.insertId
    });

    // 2. Alert for Members (Broadcast)
    const [trainerRow] = await pool.query("SELECT fullName FROM user WHERE id = ?", [trainerId]);
    const trainerName = trainerRow.length > 0 ? trainerRow[0].fullName : "a trainer";
    const broadcastMsg = `New Class Available: ${className} | Trainer: ${trainerName} | Date: ${date} | Time: ${startTime}`;
    await sendAppNotification("all", broadcastMsg, {
      title: "New Class Available",
      receiver_role: "Member",
      sender_id: adminId,
      sender_role: "Admin",
      reference_type: "CLASS",
      reference_id: result.insertId
    });

    // 3. Log Admin Activity
    import("../../utils/activityHelper.js").then(({ logAdminActivity }) => {
      logAdminActivity(adminId, "CREATE_CLASS", `Created new class: ${className}`, result.insertId);
    });

    // 3. Emit Socket Event
    const io = getIO();
    if (io) {
      io.emit("classCreated", { className, trainerId, date, startTime });
    }
  } catch (err) {
    console.error("Failed to insert class assignment alert/sockets:", err);
  }

  return {
    id: result.insertId,
    adminId,
    className,
    trainerId,
    date,
    day,
    startTime,
    endTime,
    capacity,
    status,
    members,
    price,
  };
};

/**************************************
 * SCHEDULE LIST
 **************************************/
export const listSchedulesService = async (branchId) => {
  const [rows] = await pool.query(
    `SELECT cs.*, u.fullName AS trainerName
     FROM classschedule cs
     LEFT JOIN user u ON cs.trainerId = u.id
     WHERE cs.adminId = ?
     ORDER BY cs.date ASC`,
    [adminId]
  );
  return rows;
};

/**************************************
 * BOOKING
 **************************************/
// export const bookClassService = async (memberId, scheduleId) => {
//   // Check if already booked
//   const [existingRows] = await pool.query(
//     "SELECT * FROM booking WHERE memberId = ? AND scheduleId = ?",
//     [memberId, scheduleId]
//   );

//   if (existingRows.length > 0) {
//     throw { status: 400, message: "Already booked for this class" };
//   }

//   // Check schedule exists
//   const [scheduleRows] = await pool.query(
//     "SELECT * FROM classschedule WHERE id = ?",
//     [scheduleId]
//   );

//   const schedule = scheduleRows[0];
//   if (!schedule) throw { status: 404, message: "Schedule not found" };

//   // Check capacity
//   const [bookings] = await pool.query(
//     "SELECT COUNT(*) AS count FROM booking WHERE scheduleId = ?",
//     [scheduleId]
//   );

//   const count = bookings[0]?.count ?? 0;

//   if (count >= schedule.capacity) {
//     throw { status: 400, message: "Class is full" };
//   }

//   // Insert booking
//   const [result] = await pool.query(
//     "INSERT INTO booking (memberId, scheduleId) VALUES (?, ?)",
//     [memberId, scheduleId]
//   );

//   return {
//     id: result.insertId,
//     memberId,
//     scheduleId,
//   };
// };
export const bookClassService = async (memberId, scheduleId) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    /* 1️⃣ MAP userId/memberId → member.id
       Frontend may send either member.id OR user.id (userId).
       Try member.id first, fallback to member.userId lookup. */
    let [memberRows] = await connection.query(
      "SELECT id, userId, fullName, email, phone, branchId, adminId FROM member WHERE id = ?",
      [memberId]
    );

    // Fallback: treat memberId as userId and look up the member
    if (memberRows.length === 0) {
      [memberRows] = await connection.query(
        "SELECT id, userId, fullName, email, phone, branchId, adminId FROM member WHERE userId = ?",
        [memberId]
      );
    }

    if (memberRows.length === 0) {
      throw { status: 400, message: "Member profile not found for this user" };
    }

    const member = memberRows[0];
    const realMemberId = member.id;

    /* 2️⃣ CHECK SCHEDULE EXISTS AND LOCK ROW (FOR UPDATE) */
    const [scheduleRows] = await connection.query(
      "SELECT * FROM classschedule WHERE id = ? FOR UPDATE",
      [scheduleId]
    );

    if (scheduleRows.length === 0) {
      throw { status: 404, message: "Schedule not found" };
    }

    const schedule = scheduleRows[0];

    /* 3️⃣ CHECK IF ALREADY BOOKED IN UNIFIED_BOOKINGS */
    const [existingRows] = await connection.query(
      "SELECT id FROM unified_bookings WHERE memberId = ? AND classId = ? AND bookingStatus != 'Cancelled'",
      [realMemberId, scheduleId]
    );

    if (existingRows.length > 0) {
      throw { status: 400, message: "Already booked for this class" };
    }

    /* 4️⃣ CHECK CAPACITY */
    const [bookings] = await connection.query(
      "SELECT COUNT(*) AS count FROM unified_bookings WHERE classId = ? AND bookingStatus != 'Cancelled'",
      [scheduleId]
    );

    if (bookings[0].count >= schedule.capacity) {
      throw { status: 400, message: "Class is full" };
    }

    /* 5️⃣ INSERT BOOKING INTO UNIFIED_BOOKINGS */
    const [result] = await connection.query(
      `INSERT INTO unified_bookings 
       (memberId, trainerId, classId, date, startTime, endTime, bookingType, bookingStatus, paymentStatus, branchId)
       VALUES (?, ?, ?, ?, ?, ?, 'GROUP', 'Booked', 'Pending', ?)`,
      [
        realMemberId, 
        schedule.trainerId, 
        scheduleId, 
        schedule.date, 
        schedule.startTime, 
        schedule.endTime, 
        member.branchId || null
      ]
    );

    await connection.commit();
    connection.release();

    /* 6️⃣ INSERT IN-APP NOTIFICATION ALERT */
    try {
      const io = getIO();
      const memberUserId = member.userId;
      const className = schedule.className;

      // Member
      const memMsg = `Your booking has been confirmed for ${className}`;
      if (memberUserId) {
        await sendAppNotification(memberUserId, memMsg, {
          title: "Booking Confirmed",
          receiver_role: "Member",
          sender_id: schedule.adminId, // System/Admin
          sender_role: "System",
          reference_type: "CLASS",
          reference_id: scheduleId
        });
      }

      // Trainer
      const trainerMsg = `New booking received for ${className} by ${member.fullName || 'A member'}`;
      await sendAppNotification(schedule.trainerId, trainerMsg, {
        title: "New Class Booking",
        receiver_role: "Trainer",
        sender_id: memberUserId,
        sender_role: "Member",
        reference_type: "CLASS",
        reference_id: scheduleId
      });

      // Admin
      const adminMsg = `New booking received for ${className} by ${member.fullName || 'A member'}`;
      if (schedule.adminId) {
        await sendAppNotification(schedule.adminId, adminMsg, {
          title: "New Class Booking",
          receiver_role: "Admin",
          sender_id: memberUserId,
          sender_role: "Member",
          reference_type: "CLASS",
          reference_id: scheduleId
        });
      }

      if (io) io.emit("bookingCreated", { scheduleId, classId: scheduleId });
    } catch (err) {
      console.error("Failed to insert class booking alert:", err);
    }

    return {
      id: result.insertId,
      memberId: realMemberId,
      scheduleId,
    };
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

// export const getScheduledClassesWithBookingStatusService = async (userId) => {
//   /* ================================
//      1️⃣ map userId → member.id
//   ================================= */
//   const [memberRows] = await pool.query(
//     "SELECT id FROM member WHERE userId = ? AND status = 'ACTIVE'",
//     [userId]
//   );

//   if (memberRows.length === 0) {
//     throw { status: 400, message: "Active member not found" };
//   }

//   const memberId = memberRows[0].id;

//   /* ================================
//      2️⃣ fetch schedules + booking status
//      🔥 ONLY_FULL_GROUP_BY SAFE QUERY
//   ================================= */
//   const [rows] = await pool.query(
//     `
//     SELECT
//       cs.id,
//       cs.className,
//       cs.date,
//       cs.day,
//       cs.startTime,
//       cs.endTime,
//       cs.status,
//       cs.capacity,

//       u.fullName AS trainerName,
//       b.name AS branchName,

//       COUNT(bk2.id) AS membersCount,

//       -- 🔥 FIX: aggregate use kiya
//       MAX(bk.id) AS bookingId

//     FROM classschedule cs

//     LEFT JOIN user u
//       ON cs.trainerId = u.id

//     LEFT JOIN branch b
//       ON cs.branchId = b.id

//     -- member-specific booking
//     LEFT JOIN booking bk
//       ON bk.scheduleId = cs.id
//      AND bk.memberId = ?

//     -- total members booking count
//     LEFT JOIN booking bk2
//       ON bk2.scheduleId = cs.id

//     GROUP BY
//       cs.id,
//       cs.className,
//       cs.date,
//       cs.day,
//       cs.startTime,
//       cs.endTime,
//       cs.status,
//       cs.capacity,
//       u.fullName,
//       b.name

//     ORDER BY cs.id DESC
//     `,
//     [memberId]
//   );

//   /* ================================
//      3️⃣ response formatting
//   ================================= */
//   return rows.map((item) => ({
//     id: item.id,
//     className: item.className,
//     date: item.date,
//     day: item.day,
//     time: `${item.startTime} - ${item.endTime}`,
//     trainer: item.trainerName,
//     branch: item.branchName,
//     status: item.status,
//     capacity: item.capacity,
//     membersCount: item.membersCount,

//     // ✅ booking status
//     isBooked: item.bookingId !== null,
//     bookingId: item.bookingId,
//   }));
// };

export const getScheduledClassesWithBookingStatusService = async (
  memberId,
  adminId
) => {
  // Auto-update past scheduled classes to Completed
  await pool.query(`
    UPDATE classschedule 
    SET status = 'Completed' 
    WHERE date < CURDATE() AND status = 'Scheduled'
  `);

  /* ================================
     1️⃣ check member (OPTIONAL)
     ❌ do NOT block if not found
  ================================= */
  let validMemberId = null;

  if (memberId) {
    const [memberRows] = await pool.query(
      `
      SELECT id
      FROM member
      WHERE id = ?
      `,
      [memberId]
    );

    if (memberRows.length > 0) {
      validMemberId = memberRows[0].id;
    }
  }

  /* ================================
     2️⃣ fetch schedules created by admin
     + booking status (if member valid)
  ================================= */
  const [rows] = await pool.query(
    `
    SELECT 
      cs.id,
      cs.className,
      cs.date,
      cs.day,
      cs.startTime,
      cs.endTime,
      cs.status,
      cs.capacity,

      u.fullName AS trainerName,

      COUNT(bk2.id) AS membersCount,

      MAX(bk.id) AS bookingId,

      mu.id AS bookedUserId,
      mu.fullName AS bookedMemberName,
      mu.email AS bookedMemberEmail,
      mu.phone AS bookedMemberPhone

    FROM classschedule cs

    -- trainer (to get adminId)
    LEFT JOIN user u 
      ON cs.trainerId = u.id

    -- booking ONLY if member is valid
    LEFT JOIN unified_bookings bk
      ON bk.classId = cs.id
     AND bk.memberId = ?
     AND bk.bookingStatus != 'Cancelled'

    LEFT JOIN member m
      ON m.id = bk.memberId

    LEFT JOIN user mu
      ON mu.id = m.userId

    -- total bookings
    LEFT JOIN unified_bookings bk2
      ON bk2.classId = cs.id
     AND bk2.bookingStatus != 'Cancelled'

    WHERE (u.adminId = ? OR cs.adminId = ?)

    GROUP BY 
      cs.id,
      cs.className,
      cs.date,
      cs.day,
      cs.startTime,
      cs.endTime,
      cs.status,
      cs.capacity,
      u.fullName,
      mu.id,
      mu.fullName,
      mu.email,
      mu.phone

    ORDER BY cs.id DESC
    `,
    [validMemberId, adminId, adminId]
  );

  /* ================================
     3️⃣ response (classes ALWAYS shown)
  ================================= */
  return rows.map((item) => ({
    id: item.id,
    className: item.className,
    date: item.date,
    day: item.day,
    time: `${item.startTime} - ${item.endTime}`,
    trainer: item.trainerName,
    status: item.status,
    capacity: item.capacity,
    membersCount: item.membersCount,

    isBooked: item.bookingId !== null,
    bookingId: item.bookingId,

    bookedMember: item.bookingId
      ? {
          id: item.bookedUserId,
          name: item.bookedMemberName,
          email: item.bookedMemberEmail,
          phone: item.bookedMemberPhone,
        }
      : null,
  }));
};

export const cancelBookingService = async (memberId, scheduleId) => {
  let realMemberId = memberId;
  const [memberRows] = await pool.query("SELECT id FROM member WHERE id = ?", [memberId]);
  if (memberRows.length === 0) {
    const [userRows] = await pool.query("SELECT id FROM member WHERE userId = ?", [memberId]);
    if (userRows.length > 0) realMemberId = userRows[0].id;
  }

  const [existingRows] = await pool.query(
    "SELECT id FROM unified_bookings WHERE memberId = ? AND classId = ? AND bookingStatus != 'Cancelled'",
    [realMemberId, scheduleId]
  );
  const existing = existingRows[0];
  if (!existing) throw { status: 400, message: "No booking found" };

  await pool.query("UPDATE unified_bookings SET bookingStatus = 'Cancelled' WHERE id = ?", [existing.id]);

  return true;
};

export const memberBookingsService = async (memberId) => {
  let realMemberId = memberId;
  const [memberRows] = await pool.query("SELECT id FROM member WHERE id = ?", [memberId]);
  if (memberRows.length === 0) {
    const [userRows] = await pool.query("SELECT id FROM member WHERE userId = ?", [memberId]);
    if (userRows.length > 0) realMemberId = userRows[0].id;
  }

  const [rows] = await pool.query(
    `SELECT b.*, cs.date, cs.startTime, cs.endTime, cs.day, cs.className AS className, u.fullName AS trainerName
     FROM unified_bookings b
     LEFT JOIN classschedule cs ON b.classId = cs.id
     LEFT JOIN user u ON cs.trainerId = u.id
     WHERE b.memberId = ? AND b.bookingStatus != 'Cancelled'
     ORDER BY b.id DESC`,
    [realMemberId]
  );
  return rows;
};

/**************************************
 * SCHEDULE CRUD
 **************************************/
export const getAllScheduledClassesService = async (adminId) => {
  // Auto-update past scheduled classes to Completed
  await pool.query(`
    UPDATE classschedule 
    SET status = 'Completed' 
    WHERE date < CURDATE() AND status = 'Scheduled'
  `);

  const [rows] = await pool.query(
    `
    SELECT 
      cs.*,
      u.fullName AS trainerName,
      (SELECT COUNT(*) FROM unified_bookings ub WHERE ub.classId = cs.id AND ub.bookingStatus = 'Booked') AS membersCount,
      (
        SELECT CONCAT('[', COALESCE(GROUP_CONCAT(
          JSON_OBJECT(
            'id', m.id,
            'name', m.fullName,
            'email', m.email,
            'phone', m.phone
          )
        ), ''), ']')
        FROM unified_bookings ub
        JOIN member m ON ub.memberId = m.id
        WHERE ub.classId = cs.id AND ub.bookingStatus = 'Booked'
      ) AS bookedMembers
    FROM classschedule cs
    LEFT JOIN user u ON cs.trainerId = u.id
    WHERE u.adminId = ? OR cs.adminId = ? OR cs.trainerId = ?
    ORDER BY cs.id DESC
    `,
    [adminId, adminId, adminId]
  );

  return rows.map((item) => ({
    id: item.id,
    className: item.className,
    trainerId: item.trainerId,   
    trainerName: item.trainerName,      
    trainer: item.trainerName,
    date: item.date,
    time: `${item.startTime} - ${item.endTime}`,
    day: item.day,
    status: item.status,
    membersCount: item.membersCount,
    members: typeof item.bookedMembers === "string" ? JSON.parse(item.bookedMembers || "[]") : (item.bookedMembers || []),
  }));
};

export const getScheduleByIdService = async (id) => {
  const [rows] = await pool.query(
    `SELECT cs.*, u.fullName AS trainerName
     FROM classschedule cs
     LEFT JOIN user u ON cs.trainerId = u.id
     WHERE cs.id = ?`,
    [id]
  );

  const schedule = rows[0];
  if (!schedule) throw { status: 404, message: "Class schedule not found" };
  return schedule;
};

// export const updateScheduleService = async (id, data) => {
//   const [existsRows] = await pool.query(
//     "SELECT * FROM classschedule WHERE id = ?",
//     [id]
//   );
//   const exists = existsRows[0];
//   if (!exists) throw { status: 404, message: "Class schedule not found" };

//   const fields = [];
//   const values = [];

//   // Note: use 'className' instead of 'classTypeId'
//   for (const key of [
//     "branchId", "className", "trainerId", "date", "day",
//     "startTime", "endTime", "capacity", "status", "members"
//   ]) {
//     if (data[key] !== undefined) {
//       fields.push(`${key} = ?`);
//       values.push(key === "members" ? JSON.stringify(data[key]) : data[key]);
//     }
//   }

//   if (fields.length === 0) return { ...exists, ...data };

//   values.push(id);
//   await pool.query(
//     `UPDATE classschedule SET ${fields.join(", ")} WHERE id = ?`,
//     values
//   );

//   return { ...exists, ...data };
// };

export const updateScheduleService = async (id, data) => {
  const [existsRows] = await pool.query(
    "SELECT * FROM classschedule WHERE id = ?",
    [id]
  );

  const exists = existsRows[0];
  if (!exists) throw { status: 404, message: "Class schedule not found" };

  const fields = [];
  const values = [];

  for (const key of [
    "className",
    "trainerId",
    "date",
    "day",
    "startTime",
    "endTime",
    "capacity",
    "status",
    "members",
    "price",
  ]) {
    if (data[key] !== undefined && data[key] !== null) {
      let value = data[key];

      // Convert members JSON
      if (key === "members") {
        value = JSON.stringify(value);
      }

      // Convert JS ISO date → MySQL datetime(3)
      if (key === "date") {
        value = new Date(value)
          .toISOString()
          .slice(0, 23) // keep milliseconds for datetime(3)
          .replace("T", " "); // replace T with space
      }

      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return { ...exists, ...data };

  values.push(id);

  await pool.query(
    `UPDATE classschedule SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  /* INSERT NOTIFICATIONS & SOCKET EVENT */
  try {
    const io = getIO();
    const className = exists.className || data.className;

    if (data.trainerId && data.trainerId !== exists.trainerId) {
      // Trainer Changed!
      const oldTrainerMsg = `You have been removed from class: ${exists.className}`;
      await sendAppNotification(exists.trainerId, oldTrainerMsg);
      
      const newTrainerMsg = `You have been assigned to class: ${className}`;
      await sendAppNotification(data.trainerId, newTrainerMsg);
      
      if (io) {
        io.emit("trainerAssigned", { classId: id, oldTrainerId: exists.trainerId, newTrainerId: data.trainerId });
      }
    } else {
      // General Update Notification
      const trainerMsg = `Class Updated: ${className}`;
      await sendAppNotification(exists.trainerId, trainerMsg);
    }

    // Notify Booked Members
    const [bookings] = await pool.query(
      `SELECT m.userId FROM unified_bookings ub JOIN member m ON ub.memberId = m.id WHERE ub.classId = ? AND ub.bookingStatus = 'Booked'`,
      [id]
    );
    for (const b of bookings) {
      if (b.userId) {
        await sendAppNotification(b.userId, `Your booked class ${className} has been updated.`);
      }
    }
    
    if (data.capacity !== undefined && data.capacity !== exists.capacity) {
       if (io) io.emit("capacityUpdated", { classId: id, newCapacity: data.capacity });
    }

  } catch (err) {
    console.error("Failed to process update notifications/sockets:", err);
  }

  return { ...exists, ...data };
};

// service: getPersonalAndGeneralTrainersService
// export const getPersonalAndGeneralTrainersService = async () => {
//   const [rows] = await pool.query(
//     `SELECT
//        u.id,
//        u.fullName,
//        u.email,
//        u.phone,
//        u.branchId,
//        u.roleId
//      FROM user u
//      WHERE u.roleId IN (5, 6)
//      ORDER BY u.id DESC`
//   );

//   return rows;
// };
// export const getPersonalAndGeneralTrainersService = async (adminId) => {
//   const aid = Number(adminId);
//   if (!aid) throw { status: 400, message: "adminId is required" };

//   const [rows] = await pool.query(
//     `SELECT
//        u.id,
//        u.fullName,
//        u.email,
//        u.phone,
//        u.branchId,
//        u.roleId
//      FROM user u
//      WHERE u.roleId IN (5, 6)
//        AND u.adminId = ?
//      ORDER BY u.id DESC`,
//     [aid]
//   );

//   return rows;
// };
export const getPersonalAndGeneralTrainersService = async (adminId) => {
  const aid = Number(adminId);
  if (!aid) throw { status: 400, message: "adminId is required" };

  const [rows] = await pool.query(
    `
    SELECT 
      u.id,
      u.fullName,
      u.email,
      u.phone,
      u.branchId,
      u.roleId
    FROM user u
    WHERE 
      u.roleId IN (5, 6)
      AND u.adminId = ?

      -- ❌ hide personal trainers already assigned to ACTIVE memberplan
      AND NOT EXISTS (
        SELECT 1
        FROM memberplan mp
        WHERE 
          mp.trainerId = u.id
          AND mp.trainerType = 'personal'
          AND mp.status = 'ACTIVE'
      )

    ORDER BY u.id DESC
    `,
    [aid]
  );

  return rows;
};

export const deleteScheduleService = async (id) => {
  const [existingRows] = await pool.query(
    "SELECT * FROM classschedule WHERE id = ?",
    [id]
  );
  const existing = existingRows[0];
  if (!existing) throw { status: 404, message: "Class schedule not found" };

  // Delete bookings first
  await pool.query("DELETE FROM booking WHERE scheduleId = ?", [id]);
  await pool.query("DELETE FROM unified_bookings WHERE classId = ?", [id]);

  /* INSERT NOTIFICATIONS & SOCKET EVENT */
  try {
    const io = getIO();
    
    // Notify Trainer
    const cancelMsg = `Assigned class cancelled: ${existing.className}`;
    await sendAppNotification(existing.trainerId, cancelMsg, {
      title: "Class Cancelled",
      receiver_role: "Trainer",
      sender_id: existing.adminId, // or the admin deleting it
      sender_role: "Admin",
      reference_type: "CLASS",
      reference_id: id
    });
    
    // Notify Booked Members
    const [bookings] = await pool.query(
      `SELECT m.userId FROM unified_bookings ub JOIN member m ON ub.memberId = m.id WHERE ub.classId = ? AND ub.bookingStatus = 'Booked'`,
      [id]
    );
    for (const b of bookings) {
      if (b.userId) {
        await sendAppNotification(b.userId, `Booked class cancelled: ${existing.className}`, {
          title: "Class Cancelled",
          receiver_role: "Member",
          sender_id: existing.adminId,
          sender_role: "System",
          reference_type: "CLASS",
          reference_id: id
        });
      }
    }

    // Log Admin Activity
    import("../../utils/activityHelper.js").then(({ logAdminActivity }) => {
      logAdminActivity(existing.adminId, "DELETE_CLASS", `Deleted class: ${existing.className}`, id);
    });

    if (io) {
      io.emit("classCancelled", { classId: id });
    }
    
  } catch (err) {
    console.error("Failed to process delete notifications/sockets:", err);
  }

  // Delete schedule
  await pool.query("DELETE FROM classschedule WHERE id = ?", [id]);

  return true;
};
