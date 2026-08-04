import { pool } from "../../config/db.js";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";
import { emitToUser } from "../../config/socket.js";
import { notifyAdminAndStaff } from "../../utils/notificationHelper.js";
import { sendTemplatedNotification } from "../messageTemplates/messageTemplate.service.js";

/* -----------------------------------------------------
   1️⃣  MEMBER/ADMIN CHECK-IN  (Manual + QR + Manual Times)
------------------------------------------------------ */
export const memberCheckIn = async (req, res, next) => {
  try {
    const { memberId, branchId, mode, notes, checkIn, userRole, qrAdminId, nonce, latitude, longitude, deviceId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId required",
      });
    }

    // ✅ Check-in time (default = now)
    const finalCheckIn = checkIn ? new Date(checkIn) : new Date();
    if (isNaN(finalCheckIn.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid checkIn format. Use YYYY-MM-DD HH:mm:ss",
      });
    }

    // ❌ CheckOut always NULL at check-in
    const finalCheckOut = null;

    // Check if user is a member or admin
    let isMember = false;
    let isAdmin = false;
    let userBranchId = branchId;
    let memberAdminId = null;

    // ✅ QR code adminId is required
    if (!qrAdminId) {
      return res.status(400).json({
        success: false,
        message: "QR code adminId is required. Please scan a valid admin QR code.",
      });
    }

    // First, check if member exists
    const [memberRecords] = await pool.query(
      "SELECT * FROM member WHERE id = ?",
      [memberId]
    );

    if (memberRecords.length > 0) {
      isMember = true;
      memberAdminId = memberRecords[0].adminId;
      // Always use member's branchId from database (most reliable)
      userBranchId = memberRecords[0].branchId || branchId;
      
      // ✅ Validate adminId match - QR code's adminId must match member's adminId
      if (!memberAdminId) {
        return res.status(400).json({
          success: false,
          message: "Member adminId not found. Member must be added by an admin.",
        });
      }
      
      const qrAdminIdInt = parseInt(qrAdminId);
      const memberAdminIdInt = parseInt(memberAdminId);
      
      if (qrAdminIdInt !== memberAdminIdInt) {
        return res.status(400).json({
          success: false,
          message: "This QR code belongs to a different admin. You can only scan your admin's QR code.",
        });
      }
    } else {
      // Not a member, check if staff/user exists
      const [userRecords] = await pool.query(
        `SELECT u.*, r.name as roleName FROM user u 
         LEFT JOIN role r ON u.roleId = r.id 
         WHERE u.id = ?`,
        [memberId]
      );

      if (userRecords.length > 0) {
        const user = userRecords[0];
        const roleName = user.roleName?.toUpperCase() || '';
        
        // ❌ Block admin check-in - Admin cannot check-in themselves
        if (roleName === 'ADMIN' || roleName === 'SUPERADMIN') {
          return res.status(403).json({
            success: false,
            message: "Admin cannot check-in. Only staff (members, receptionists, trainers) can check-in using admin's QR code.",
          });
        }
        
        // For staff (receptionist, trainer, etc.), check their adminId
        // Staff members have adminId in user table
        let staffAdminId = user.adminId;
        
        // If adminId not in user table, check staff table
        if (!staffAdminId) {
          const [staffRecords] = await pool.query(
            "SELECT adminId FROM staff WHERE userId = ?",
            [memberId]
          );
          if (staffRecords.length > 0 && staffRecords[0].adminId) {
            staffAdminId = staffRecords[0].adminId;
          }
        }
        
        // ✅ Validate adminId match for staff
        if (!staffAdminId) {
          return res.status(400).json({
            success: false,
            message: "Staff adminId not found. Staff must be assigned to an admin.",
          });
        }
        
        const qrAdminIdInt = parseInt(qrAdminId);
        const staffAdminIdInt = parseInt(staffAdminId);
        
        if (qrAdminIdInt !== staffAdminIdInt) {
          return res.status(400).json({
            success: false,
            message: "This QR code belongs to a different admin. You can only scan your admin's QR code.",
          });
        }
        
        // Use user's branchId if not provided
        if (!userBranchId && user.branchId) {
          userBranchId = user.branchId;
        }
        // If still no branchId, use 1 as default
        if (!userBranchId) {
          userBranchId = 1;
        }
      } else {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    }

    // 🔁 Prevent multiple open check-ins same day
    const [existing] = await pool.query(
      `
      SELECT id FROM memberattendance
      WHERE memberId = ?
        AND DATE(checkIn) = CURDATE()
        AND checkOut IS NULL
      `,
      [memberId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: isMember ? "Member already checked in" : "Already checked in",
      });
    }

    // ✅ QR NONCE SECURITY CHECK
    if (mode === "QR" && nonce) {
      const [nonceCheck] = await pool.query(
        "SELECT * FROM used_qr_nonces WHERE nonce = ?",
        [nonce]
      );
      if (nonceCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: "This QR code has already been scanned. Please refresh your QR code.",
        });
      }
      
      // Save nonce to prevent reuse
      await pool.query(
        "INSERT INTO used_qr_nonces (nonce, createdAt) VALUES (?, NOW())",
        [nonce]
      );
    }

    // ✅ GPS LOCATION CHECK (if QR mode and branch has GPS set)
    if (mode === "QR" && latitude && longitude && userBranchId) {
      const [[branchData]] = await pool.query(
        "SELECT latitude, longitude, attendanceRadiusMeters FROM branch WHERE id = ?",
        [userBranchId]
      );

      if (branchData && branchData.latitude && branchData.longitude) {
        // Haversine formula to calculate distance in meters
        const R = 6371000; // Earth radius in meters
        const lat1 = parseFloat(branchData.latitude) * Math.PI / 180;
        const lat2 = parseFloat(latitude) * Math.PI / 180;
        const dLat = (parseFloat(latitude) - parseFloat(branchData.latitude)) * Math.PI / 180;
        const dLon = (parseFloat(longitude) - parseFloat(branchData.longitude)) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceMeters = R * c;
        const allowedRadius = branchData.attendanceRadiusMeters || 50;

        if (distanceMeters > allowedRadius) {
          return res.status(400).json({
            success: false,
            message: `❌ You are too far from the gym (${Math.round(distanceMeters)}m away). You must be within ${allowedRadius}m to mark attendance.`,
          });
        }
      }
    }

    // ✅ Get client IP address
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;

    // ✅ INSERT with GPS + Device data
    await pool.query(
      `
      INSERT INTO memberattendance
      (memberId, branchId, checkIn, checkOut, mode, status, notes, latitude, longitude, deviceId, ipAddress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        memberId,
        userBranchId || null,
        finalCheckIn,
        finalCheckOut,
        mode || "QR",
        "In Gym",
        notes || null,
        latitude || null,
        longitude || null,
        deviceId || null,
        ipAddress || null,
      ]
    );
    // Send check-in notification to member
    if (isMember && memberRecords && memberRecords.length > 0) {
      const member = memberRecords[0];
      const checkInTime = finalCheckIn.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      const checkInDate = finalCheckIn.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      
      let gymName = "GymSoft";
      const tenantId = memberAdminId || member.adminId || null;
      if (tenantId) {
        const [adminRows] = await pool.query("SELECT gymName FROM user WHERE id = ?", [tenantId]);
        if (adminRows.length > 0 && adminRows[0].gymName) {
          gymName = adminRows[0].gymName;
        }
      }

      await sendTemplatedNotification({
        eventKey: 'MEMBER_ATTENDANCE',
        tenantId: tenantId,
        receiverId: member.userId,
        receiverRole: 'Member',
        receiverEmail: member.email,
        receiverPhone: member.phone,
        variables: {
          Name: member.fullName,
          Date: checkInDate,
          Status: 'Checked In',
          GymName: gymName,
          Time: checkInTime
        },
        referenceType: 'ATTENDANCE',
        referenceId: memberId.toString(),
        actionUrl: '/member-dashboard'
      });
    }

    // Emit socket event to admin
    const adminToNotify = isMember ? memberAdminId : (typeof staffAdminId !== 'undefined' ? staffAdminId : null);
    if (adminToNotify) {
      emitToUser(`admin_${adminToNotify}`, "checkin_update", {
        type: isMember ? "member" : "staff",
        action: "checkin",
        memberId,
        branchId: userBranchId
      });

      // Send app notification to admin and their staff
      const attName = isMember ? memberRecords[0].fullName : (typeof userRecords !== 'undefined' ? userRecords[0].fullName : "User");
      const checkInTime = finalCheckIn.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      await notifyAdminAndStaff(adminToNotify, `${attName} has checked in at ${checkInTime}.`, {
        title: "New Check-In",
        reference_type: "ATTENDANCE"
      });
    }


    res.json({
      success: true,
      message: isMember ? "Member checked in successfully" : "Checked in successfully",
    });
  } catch (err) {
    next(err);
  }
};


export const getAttendanceByMemberId = async (req, res, next) => {
  try {
    const memberId = req.params.memberId;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required",
      });
    }

    // 📌 Fetch all attendance of this member or staff (latest first)
    const [rows] = await pool.query(
      `
      SELECT 
        a.id,
        a.memberId,
        a.staffId,
        a.branchId,
        a.checkIn,
        a.checkOut,
        a.createdAt,
        a.notes,
        a.status,
        a.mode,
        COALESCE(m.fullName, u.fullName) AS fullName
      FROM memberattendance a
      LEFT JOIN member m ON a.memberId = m.id
      LEFT JOIN staff s ON a.staffId = s.id
      LEFT JOIN user u ON s.userId = u.id
      WHERE a.memberId = ? 
         OR a.staffId = ? 
         OR a.memberId = (SELECT id FROM member WHERE userId = ? LIMIT 1)
         OR a.staffId = (SELECT id FROM staff WHERE userId = ? LIMIT 1)
      ORDER BY a.id DESC
      `,
      [memberId, memberId, memberId, memberId]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        attendance: [],
      });
    }

    res.json({
      success: true,
      attendance: rows,
    });

  } catch (err) {
    next(err);
  }
};


/* -----------------------------------------------------
   2️⃣  MEMBER CHECK-OUT (Manual Checkout Time Supported)
------------------------------------------------------ */
export const memberCheckOut = async (req, res, next) => {
  try {
    const attendanceId = req.params.id; // /checkout/:id

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "attendanceId is required in params",
      });
    }

    // 1️⃣ Check record exists
    const [existing] = await pool.query(
      `SELECT * FROM memberattendance WHERE id = ?`,
      [attendanceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const record = existing[0];

    // 2️⃣ Already checked out?
    if (record.checkOut !== null) {
      return res.status(400).json({
        success: false,
        message: "Member already checked out",
      });
    }

    // 3️⃣ Checkout time = now
    const finalCheckOut = new Date();

    // 4️⃣ Update checkout + status
    const [result] = await pool.query(
      `
      UPDATE memberattendance
      SET 
        checkOut = ?,
        status = 'Present'
      WHERE id = ?
      `,
      [finalCheckOut, attendanceId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Checkout update failed",
      });
    }

    // Fetch adminId to notify
    let adminId = null;
    try {
      if (record.memberId) {
        const [mRec] = await pool.query("SELECT adminId FROM member WHERE id = ?", [record.memberId]);
        if (mRec.length > 0) {
          adminId = mRec[0].adminId;
        } else {
          const [sRec] = await pool.query("SELECT adminId FROM staff WHERE userId = ?", [record.memberId]);
          if (sRec.length > 0) {
            adminId = sRec[0].adminId;
          }
        }
      } else if (record.staffId) {
        const [sRec] = await pool.query("SELECT adminId FROM staff WHERE id = ?", [record.staffId]);
        if (sRec.length > 0) {
          adminId = sRec[0].adminId;
        }
      }

      if (adminId) {
        emitToUser(`admin_${adminId}`, "checkin_update", {
          action: "checkout",
          id: attendanceId
        });
        
        try {
          // Send checkout notification to member
          let memberRows = [];
          if (record.memberId) {
            [memberRows] = await pool.query(
              "SELECT m.userId, m.phone, m.fullName, u.email FROM member m LEFT JOIN user u ON m.userId = u.id WHERE m.id = ?", 
              [record.memberId]
            );
            
            if (memberRows.length > 0) {
              const member = memberRows[0];
              const checkOutTime = finalCheckOut.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
              const checkOutDate = finalCheckOut.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
              
              let gymName = "GymSoft";
              const [adminRows] = await pool.query("SELECT gymName FROM user WHERE id = ?", [adminId]);
              if (adminRows.length > 0 && adminRows[0].gymName) {
                gymName = adminRows[0].gymName;
              }

              await sendTemplatedNotification({
                eventKey: 'MEMBER_ATTENDANCE',
                tenantId: adminId,
                receiverId: member.userId,
                receiverRole: 'Member',
                receiverEmail: member.email,
                receiverPhone: member.phone,
                variables: {
                  Name: member.fullName,
                  Date: checkOutDate,
                  Status: 'Checked Out',
                  GymName: gymName,
                  Time: checkOutTime
                },
                referenceType: 'ATTENDANCE',
                referenceId: record.memberId.toString(),
                actionUrl: '/member-dashboard'
              });
            }
          }

          // Also notify Admin & Staff Dashboards
          const memberName = record.memberId ? (memberRows?.[0]?.fullName || "Member") : "Staff";
          const checkOutTime = finalCheckOut.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
          await notifyAdminAndStaff(adminId, `${memberName} has checked out at ${checkOutTime}.`, {
            title: "New Check-Out",
            reference_type: "ATTENDANCE"
          });

        } catch (notifErr) {
          console.error("Failed to send checkout notification:", notifErr);
        }
      }
    } catch (err) {
      console.error("Failed to emit checkout socket update:", err);
    }

    res.json({
      success: true,
      message: "Member checked out successfully",
      checkOut: finalCheckOut,
      status: "Present",
    });
  } catch (err) {
    next(err);
  }
};



/* -----------------------------------------------------
   3️⃣  DAILY ATTENDANCE LIST (Search + Filter + Status)
------------------------------------------------------ */
export const getDailyAttendance = async (req, res, next) => {
  try {
    const { startDate, endDate, date, search, branchId } = req.query;

    let sql = `
      SELECT 
        a.id,
        a.memberId,
        a.branchId,
        a.checkIn,
        a.checkOut,
        a.mode,
        a.status,
        a.notes,
        m.fullName,
        DATE(a.checkIn) AS attendanceDate
      FROM memberattendance a
      LEFT JOIN member m ON m.id = a.memberId
      WHERE 1=1
    `;

    const params = [];

    if (branchId) {
      sql += ` AND a.branchId = ?`;
      params.push(branchId);
    }

    if (startDate && endDate) {
      const mysqlStart = new Date(startDate).toISOString().slice(0, 10);
      const mysqlEnd = new Date(endDate).toISOString().slice(0, 10);
      sql += ` AND DATE(a.checkIn) BETWEEN ? AND ?`;
      params.push(mysqlStart, mysqlEnd);
    } else if (date) {
      const mysqlDate = new Date(date).toISOString().slice(0, 10);
      sql += ` AND DATE(a.checkIn) = ?`;
      params.push(mysqlDate);
    }

    if (search) {
      sql += ` AND (m.fullName LIKE ? OR m.memberCode LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY a.checkIn DESC`;

    const [rows] = await pool.query(sql, params);

    const formatted = rows.map(r => ({
      ...r,
      computedStatus: r.checkOut ? "Completed" : "Active",
    }));

    res.json({
      success: true,
      attendance: formatted,
    });

  } catch (err) {
    next(err);
  }
};


/* -----------------------------------------------------
   4️⃣  ATTENDANCE DETAIL VIEW
------------------------------------------------------ */
export const attendanceDetail = async (req, res, next) => {
  try {
    const id = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT 
        a.*, 
        m.fullName, 
        m.phone
      FROM memberattendance a
      LEFT JOIN member m ON a.memberId = m.id
      WHERE a.id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      attendance: rows[0],
    });

  } catch (err) {
    next(err);
  }
};


/* -----------------------------------------------------
   5️⃣  TODAY SUMMARY (Dashboard Cards)
------------------------------------------------------ */
export const getTodaySummary = async (req, res, next) => {
  try {
    const [present] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance WHERE DATE(checkIn) = CURDATE()`
    );

    const [active] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance WHERE DATE(checkIn) = CURDATE() AND checkOut IS NULL`
    );

    const [completed] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance WHERE DATE(checkIn) = CURDATE() AND checkOut IS NOT NULL`
    );

    res.json({
      success: true,
      summary: {
        present: present[0].count,
        active: active[0].count,
        completed: completed[0].count,
      },
    });

  } catch (err) {
    next(err);
  }
};

export const deleteAttendance = async (req, res, next) => {
  try {
    const attendanceId = req.params.id;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "attendanceId is required",
      });
    }

    // Record exist karta hai?
    const [existing] = await pool.query(
      `SELECT id, memberId, staffId FROM memberattendance WHERE id = ?`,
      [attendanceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const record = existing[0];

    // Fetch adminId to notify
    let adminId = null;
    try {
      if (record.memberId) {
        const [mRec] = await pool.query("SELECT adminId FROM member WHERE id = ?", [record.memberId]);
        if (mRec.length > 0) {
          adminId = mRec[0].adminId;
        } else {
          const [sRec] = await pool.query("SELECT adminId FROM staff WHERE userId = ?", [record.memberId]);
          if (sRec.length > 0) {
            adminId = sRec[0].adminId;
          }
        }
      } else if (record.staffId) {
        const [sRec] = await pool.query("SELECT adminId FROM staff WHERE id = ?", [record.staffId]);
        if (sRec.length > 0) {
          adminId = sRec[0].adminId;
        }
      }
    } catch (err) {
      console.error("Failed to fetch adminId for attendance delete emit:", err);
    }

    // Delete record
    const [result] = await pool.query(
      `DELETE FROM memberattendance WHERE id = ?`,
      [attendanceId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete attendance",
      });
    }

    if (adminId) {
      try {
        emitToUser(`admin_${adminId}`, "checkin_update", {
          action: "delete",
          id: attendanceId
        });
      } catch (err) {
        console.error("Failed to emit delete socket update:", err);
      }
    }

    res.json({
      success: true,
      message: "Attendance deleted successfully",
    });

  } catch (err) {
    next(err);
  }
};
// export const getAttendanceByAdminId = async (req, res, next) => {
//   try {
//     const { adminId, date, search } = req.query;

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required",
//       });
//     }

//     let sql = `
//       SELECT
//         a.id,
//         DATE(a.checkIn) AS date,

//         /* NAME */
//         CASE
//           WHEN a.staffId IS NOT NULL THEN su.fullName
//           ELSE mu.fullName
//         END AS name,

//         /* ROLE */
//         CASE
//           WHEN a.staffId IS NOT NULL THEN sr.name
//           ELSE mr.name
//         END AS role,

//         a.checkIn,
//         a.checkOut,
//         a.mode,
//         sh.shiftType AS shift,
//         a.status

//       FROM memberattendance a

//       /* ===== STAFF ===== */
//       LEFT JOIN staff s ON s.id = a.staffId
//       LEFT JOIN user su ON su.id = s.userId
//       LEFT JOIN role sr ON sr.id = su.roleId

//       /* ===== MEMBER ===== */
//       LEFT JOIN member m ON m.userId= a.memberId
//       LEFT JOIN user mu ON mu.id = m.userId
//       LEFT JOIN role mr ON mr.id = mu.roleId

//       /* ===== SHIFT (STAFF ONLY) ===== */
//       LEFT JOIN shifts sh
//         ON sh.staffIds = a.staffId
//        AND DATE(sh.shiftDate) = DATE(a.checkIn)

//       /* ===== ADMIN FILTER (CORE LOGIC) ===== */
//       WHERE (
//         (a.staffId IS NOT NULL AND s.adminId = ?)
//         OR
//         (a.memberId IS NOT NULL AND m.adminId = ?)
//       )
//     `;

//     const params = [adminId, adminId];

//     if (date) {
//       sql += ` AND DATE(a.checkIn) = ?`;
//       params.push(date);
//     }

//     if (search) {
//       sql += `
//         AND (
//           su.fullName LIKE ?
//           OR mu.fullName LIKE ?
//         )
//       `;
//       params.push(`%${search}%`, `%${search}%`);
//     }

//     sql += ` ORDER BY a.checkIn DESC`;

//     const [rows] = await pool.query(sql, params);

//     res.json({
//       success: true,
//       attendance: rows,
//     });
//   } catch (err) {
//     next(err);
//   }
// }

// export const getAttendanceByAdminId = async (req, res, next) => {
//   try {
//     const { adminId } = req.query; // Only adminId is coming from the request

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required",
//       });
//     }

//     // SQL query to get attendance records based on adminId
//     let sql = `
//       SELECT
//         a.id,
//         DATE(a.checkIn) AS date,
//         mu.fullName AS name,  -- Member's full name
//         mr.name AS role,      -- Member's role from the role table
//         a.checkIn,
//         a.checkOut,
//         a.mode,
//         NULL AS shift,        -- No shift in this case, so null
//         a.status

//       FROM memberattendance a

//       /* ===== MEMBER JOIN ===== */
//       LEFT JOIN member m ON m.userId = a.memberId
//       LEFT JOIN user mu ON mu.id = m.userId
//       LEFT JOIN role mr ON mr.id = mu.roleId  -- Getting role name

//       /* ===== FILTER BASED ON adminId IN MEMBER TABLE ===== */
//       WHERE m.adminId = ?  -- Ensuring that the adminId in the member table matches
//     `;

//     const params = [adminId];  // Only passing adminId as a parameter

//     // Execute the query with parameters
//     const [rows] = await pool.query(sql, params);

//     res.json({
//       success: true,
//       attendance: rows, // Returning the attendance data
//     });
//   } catch (err) {
//     next(err);  // Handling errors
//   }
// };


export const getAttendanceByAdminId = async (req, res, next) => {
  try {
    const {
      adminId,
      date,
      startDate,
      endDate,
      branchId,
      role,
      status,
      staffId,
      search,
      category = "all",
      view
    } = req.query;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    // Direct SQL Query to fetch real actual attendance records from memberattendance table
    let sql = `
      SELECT 
        a.id,
        a.memberId,
        a.staffId,
        COALESCE(u.fullName, u_member.fullName, 'Staff/Member') AS name,
        COALESCE(r.name, r_member.name, 'Staff') AS role,
        COALESCE(b.name, 'Main Branch') AS branch,
        DATE_FORMAT(a.checkIn, '%Y-%m-%d') AS date,
        a.checkIn,
        a.checkOut,
        a.mode,
        a.status,
        a.notes,
        sh.shiftType AS shift
      FROM memberattendance a
      LEFT JOIN user u ON u.id = a.memberId
      LEFT JOIN role r ON r.id = u.roleId
      LEFT JOIN member m ON m.id = a.memberId
      LEFT JOIN user u_member ON u_member.id = m.userId
      LEFT JOIN role r_member ON r_member.id = u_member.roleId
      LEFT JOIN branch b ON b.id = a.branchId
      LEFT JOIN shifts sh ON (sh.staffIds = a.staffId OR sh.staffIds = a.memberId) AND DATE(sh.shiftDate) = DATE(a.checkIn)
      WHERE (
        u.adminId = ? OR m.adminId = ? OR a.branchId IN (SELECT id FROM branch WHERE adminId = ?)
      )
    `;

    const params = [adminId, adminId, adminId];

    if (date) {
      sql += ` AND DATE(a.checkIn) = ?`;
      params.push(date.split('T')[0]);
    } else if (startDate && endDate) {
      sql += ` AND DATE(a.checkIn) >= ? AND DATE(a.checkIn) <= ?`;
      params.push(startDate.split('T')[0], endDate.split('T')[0]);
    }

    if (branchId && branchId !== "All") {
      sql += ` AND a.branchId = ?`;
      params.push(branchId);
    }

    if (role && role !== "All") {
      sql += ` AND (LOWER(r.name) = LOWER(?) OR LOWER(r_member.name) = LOWER(?))`;
      params.push(role, role);
    }

    if (status && status !== "All") {
      sql += ` AND LOWER(a.status) = LOWER(?)`;
      params.push(status);
    }

    if (search && search.trim() !== "") {
      const q = `%${search.trim()}%`;
      sql += ` AND (u.fullName LIKE ? OR u_member.fullName LIKE ? OR r.name LIKE ? OR r_member.name LIKE ?)`;
      params.push(q, q, q, q);
    }

    sql += ` ORDER BY a.checkIn DESC LIMIT 500`;

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      attendance: rows,
    });
  } catch (err) {
    next(err);
  }
};
