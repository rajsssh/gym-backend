/* --------------------------------------------------------

   CREATE BOOKING REQUEST (MEMBER)
-------------------------------------------------------- */
import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";
import { sendAppNotification } from "../../utils/notificationHelper.js";
import { getIO, emitToUser } from "../../config/socket.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

const generate6DigitPassword = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createBookingRequest = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    const {
      fullName,
      email,
      phone,
      gender,
      address,
      dateOfBirth,
      adminId,
      branchId = null,
      planId,
      price,
      upiId = null,
      paymentMode = "Cash",
      userId = null
    } = req.body;

    /* -------------------------
       1️⃣ BASIC VALIDATION
    ------------------------- */
    if (!adminId || !planId || !price) {
      return res.status(400).json({
        success: false,
        message: "adminId, planId and price are required"
      });
    }

    if (!userId && (!fullName || !phone || !gender)) {
      return res.status(400).json({
        success: false,
        message: "fullName, phone, and gender are required for new bookings"
      });
    }

    await connection.beginTransaction();

    /* -------------------------
       2️⃣ VALIDATE PLAN
    ------------------------- */
    const [[plan]] = await connection.query(
      `SELECT id, name, price FROM memberplan WHERE id = ?`,
      [planId]
    );

    if (!plan) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid planId"
      });
    }

    let targetUserId = userId;
    let targetMemberId = null;
    let isNewUser = false;
    let resolvedFullName = fullName;

    /* -------------------------
       3️⃣ RESOLVE USER & MEMBER
    ------------------------- */
    if (!targetUserId && phone) {
      // Look up by phone
      const [[existingUser]] = await connection.query(
        `SELECT id, fullName FROM user WHERE phone = ? AND adminId = ?`,
        [phone, adminId]
      );
      if (existingUser) {
        targetUserId = existingUser.id;
        if (!resolvedFullName) resolvedFullName = existingUser.fullName;
      }
    }

    if (targetUserId) {
      // Existing User Flow
      const [[existingUserCheck]] = await connection.query(
        `SELECT id, fullName, email, phone FROM user WHERE id = ?`,
        [targetUserId]
      );

      if (!existingUserCheck) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "User not found"
        });
      }
      
      if (!resolvedFullName) resolvedFullName = existingUserCheck.fullName;

      const [[existingMember]] = await connection.query(
        `SELECT id FROM member WHERE userId = ?`,
        [targetUserId]
      );
      targetMemberId = existingMember ? existingMember.id : null;
      
    } else {
      // Create New User Flow
      isNewUser = true;
      const plainPassword = generate6DigitPassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const [userResult] = await connection.query(
        `
        INSERT INTO \`user\`
          (adminId, fullName, email, phone, gender, address, dateOfBirth, roleId, branchId, password, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Inactive')
        `,
        [
          adminId,
          resolvedFullName,
          email || null,
          phone,
          gender || null,
          address || null,
          dateOfBirth ? new Date(dateOfBirth) : null,
          4,              // MEMBER role
          branchId,
          hashedPassword
        ]
      );
      targetUserId = userResult.insertId;
    }

    /* -------------------------
       4️⃣ UPLOAD PAYMENT PROOF
    ------------------------- */
    let paymentProofImage = null;
    if (req.files && req.files.paymentProofImage) {
      const { uploadToCloudinary } = await import("../../config/cloudinary.js");
      paymentProofImage = await uploadToCloudinary(req.files.paymentProofImage, "gym/payment-proofs");
    }

    /* -------------------------
       5️⃣ CREATE PAYMENT & PLAN ASSIGNMENT (Replacing booking_requests logic for payments)
    ------------------------- */
    const isCash = paymentMode === "Cash";
    const finalStatus = isCash ? "Approved" : "Pending";
    const planStatus = isCash ? "Active" : "Pending";

    // 1. Insert Payment
    const invoiceNo = "INV-" + Date.now() + "-" + Math.floor(Math.random() * 999);
    const [paymentResult] = await connection.query(
      `INSERT INTO payment (memberId, planId, amount, invoiceNo, paymentDate, paymentMode, transactionId, paymentProofImage, status)
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [
        targetMemberId,
        planId,
        price || plan.price,
        invoiceNo,
        paymentMode,
        upiId || null,
        paymentProofImage || null,
        finalStatus
      ]
    );

    // 2. Insert Plan Assignment
    const planStartDate = new Date();
    const planEndDate = new Date(planStartDate);
    planEndDate.setDate(planEndDate.getDate() + Number(plan.validityDays || 30));

    await connection.query(
      `INSERT INTO member_plan_assignment 
        (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        targetMemberId,
        planId,
        planStartDate,
        planEndDate,
        paymentMode,
        price || plan.price,
        planStatus,
        adminId || null
      ]
    );

    await connection.commit();

    /* -------------------------
       6️⃣ EMIT SOCKET & EMAIL NOTIFICATION TO ADMIN & MEMBER
    ------------------------- */
    try {
      await sendAppNotification(adminId, `New ${isCash ? 'Cash' : 'Online'} plan purchase from ${resolvedFullName || phone} for ${plan.name}`, {
        title: "New Plan Purchase",
        reference_type: "PAYMENT",
        reference_id: paymentResult.insertId
      });

      if (targetUserId) {
        await sendAppNotification(targetUserId, `Your plan purchase for ${plan.name} has been submitted successfully.${!isCash ? ' It is pending admin approval.' : ''}`, {
          title: "Plan Purchase Submitted",
          reference_type: "PAYMENT",
          reference_id: paymentResult.insertId
        });
      }

      const [[adminRow]] = await connection.query(`SELECT email FROM user WHERE id = ?`, [adminId]);
      if (adminRow && adminRow.email && !isCash) {
        await dispatchNotification({
          category: "payment",
          toEmail: adminRow.email,
          toUserId: adminId,
          subject: "New Plan Payment Received",
          message: `Hello Admin,\n\nYou have received a new online payment from ${resolvedFullName || phone} for the plan "${plan.name}".\n\nPlease log in to the admin dashboard (Payments Menu) to verify and approve the payment to activate the plan.`,
          isSystemEvent: false,
          adminIdForCredits: adminId
        });
      }
    } catch (socketErr) {
      console.error("Notification emit error:", socketErr);
    }

    return res.status(201).json({
      success: true,
      message: isCash ? "Plan activated successfully" : "Payment submitted successfully. Pending verification.",
      data: {
        paymentId: paymentResult.insertId,
        userId: targetUserId,
        userName: resolvedFullName,
        planName: plan.name,
        bookingStatus: finalStatus,
        userStatus: isNewUser ? "Inactive" : "Active"
      }
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("❌ Create Booking/Payment Error:", err);

    return res.status(500).json({
      success: false,
      message: err.sqlMessage || err.message
    });
  } finally {
    if (connection) connection.release();
  }
};


export const getBookingRequestsForAdmin = async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        br.id AS bookingRequestId,
        br.status AS bookingStatus,
        br.createdAt,
        br.price,
        br.upiId,
        br.paymentMode,
        br.paymentProofImage,

        u.id AS userId,
        u.fullName AS userName,
        u.email,
        u.phone,
        u.gender,
        u.status AS userStatus,

        m.id AS memberId,
        m.status AS memberStatus,

        mp.name AS planName,
        b.name AS branchName

      FROM booking_requests br
      JOIN user u ON u.id = br.userId
      LEFT JOIN member m ON m.id = br.memberId
      LEFT JOIN memberplan mp ON mp.id = br.planId
      LEFT JOIN branch b ON b.id = br.branchId
      WHERE br.adminId = ?
      ORDER BY br.createdAt DESC
      `,
      [adminId]
    );

    return res.json({
      success: true,
      total: rows.length,
      data: rows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking requests"
    });
  }
};


;

/* ---------------------------------
   🔐 6-Digit Password Generator
---------------------------------- */


/* =====================================================
   ✅ APPROVE BOOKING REQUEST (ADMIN)
===================================================== */
export const approveBookingRequest = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();
    const { bookingRequestId } = req.params;

    await connection.beginTransaction();

    /* 1️⃣ Fetch booking + user */
    const [[booking]] = await connection.query(
      `
      SELECT br.*, u.fullName, u.email, u.phone, u.gender, u.address, u.dateOfBirth
      FROM booking_requests br
      JOIN user u ON u.id = br.userId
      WHERE br.id = ? AND br.status = 'pending'
      `,
      [bookingRequestId]
    );

    if (!booking) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Pending booking not found"
      });
    }

    /* 2️⃣ Fetch plan */
    const [[plan]] = await connection.query(
      `SELECT validityDays, price FROM memberplan WHERE id = ?`,
      [booking.planId]
    );

    const membershipFrom = new Date();
    const membershipTo = new Date();
    membershipTo.setDate(membershipFrom.getDate() + plan.validityDays);

    // Check if member already exists for this userId
    const [[existingMember]] = await connection.query(
      `SELECT id FROM member WHERE userId = ?`,
      [booking.userId]
    );

    let activeMemberId;
    let plainPassword = null;

    if (existingMember) {
      // EXISTING MEMBER FLOW:
      activeMemberId = existingMember.id;

      // 1. Update existing member table
      await connection.query(
        `UPDATE member SET 
            planId = ?, 
            membershipFrom = ?, 
            membershipTo = ?, 
            paymentMode = ?, 
            amountPaid = ?, 
            status = 'Active'
         WHERE id = ?`,
        [
          booking.planId,
          membershipFrom,
          membershipTo,
          booking.upiId ? "UPI" : "Cash",
          booking.price || plan.price,
          activeMemberId
        ]
      );

      // 2. Update user status to active (in case it was Inactive)
      await connection.query(
        `UPDATE user SET status = 'Active' WHERE id = ?`,
        [booking.userId]
      );

      // 3. Create plan assignment
      await connection.query(
        `INSERT INTO member_plan_assignment 
          (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, NOW())`,
        [
          activeMemberId,
          booking.planId,
          membershipFrom,
          membershipTo,
          booking.upiId ? "UPI" : "Cash",
          booking.price || plan.price,
          booking.adminId
        ]
      );

    } else {
      // NEW USER / VISITOR FLOW (Original Flow):
      plainPassword = generate6DigitPassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const [memberResult] = await connection.query(
        `
        INSERT INTO member
          (userId, adminId, fullName, email, phone, gender, address, dateOfBirth, planId, branchId,
           password, membershipFrom, membershipTo, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        `,
        [
          booking.userId,
          booking.adminId,
          booking.fullName,
          booking.email,
          booking.phone,
          booking.gender,
          booking.address,
          booking.dateOfBirth,
          booking.planId,
          booking.branchId,
          hashedPassword,
          membershipFrom,
          membershipTo
        ]
      );

      activeMemberId = memberResult.insertId;

      await connection.query(
        `UPDATE user SET status = 'Active', password = ? WHERE id = ?`,
        [hashedPassword, booking.userId]
      );

      await connection.query(
        `INSERT INTO member_plan_assignment 
          (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, NOW())`,
        [
          activeMemberId,
          booking.planId,
          membershipFrom,
          membershipTo,
          booking.paymentMode || (booking.upiId ? "UPI" : "Cash"),
          booking.price || plan.price,
          booking.adminId
        ]
      );
    }

    // Insert payment record so revenue is tracked
    const invoiceNo = "INV-" + Date.now() + "-" + Math.floor(Math.random() * 999);
    await connection.query(
      `INSERT INTO payment (memberId, planId, amount, invoiceNo, paymentDate, collectedByName, paymentMode, transactionId, paymentProofImage, status) 
       VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, 'Completed')`,
      [
        activeMemberId, 
        booking.planId, 
        booking.price || plan.price, 
        invoiceNo, 
        "Admin", 
        booking.paymentMode || (booking.upiId ? "UPI" : "Cash"),
        booking.upiId || null,
        booking.paymentProofImage || null
      ]
    );

    /* Update booking_requests status */
    await connection.query(
      `UPDATE booking_requests SET status = 'approved', memberId = ? WHERE id = ?`,
      [activeMemberId, bookingRequestId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Booking approved & member activated",
      generatedPassword: plainPassword
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.sqlMessage || err.message
    });
  } finally {
    if (connection) connection.release();
  }
};







/* --------------------------------------------------------
   GET ALL BOOKING REQUESTS (ADMIN)
-------------------------------------------------------- */
// export const getAllBookingRequests = async (req, res) => {
//   try {
//    const [rows] = await pool.query(`
//   SELECT 
//     br.*,
//     m.fullName AS memberName,
//     c.className,
//     IFNULL(a.fullName, 'Pending') AS adminName
//   FROM booking_requests br
//   LEFT JOIN member m ON m.id = br.memberId
//   LEFT JOIN classschedule c ON c.id = br.classId
//   LEFT JOIN user a ON a.id = br.adminId
//   LEFT JOIN branch b ON b.id = br.branchId
//   ORDER BY br.createdAt DESC
// `);


//     res.json({ success: true, requests: rows });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


export const getAllBookingRequests = async (req, res, next) => {
  try {
    const adminId = Number(req.query.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required"
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        br.*,
        br.paymentProofImage,
        br.paymentMode,

        u.fullName AS memberName,        -- ✅ from user table
        u.email AS memberEmail,
        u.phone AS memberPhone,

        c.className,

        IFNULL(a.fullName, 'Pending') AS adminName,
        b.name AS branchName

      FROM booking_requests br

      -- booking → member
      LEFT JOIN member m 
        ON m.id = br.memberId

      -- member → user (MAIN FIX)
      LEFT JOIN user u 
        ON u.id = m.userId

      -- class
      LEFT JOIN classschedule c 
        ON c.id = br.classId

      -- admin user
      LEFT JOIN user a 
        ON a.id = br.adminId

      -- branch
      LEFT JOIN branch b 
        ON b.id = br.branchId

      WHERE br.adminId = ?
      ORDER BY br.createdAt DESC
      `,
      [adminId]
    );

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    next(err);
  }
};

// export const getAllBookingRequests = async (req, res) => {
//   try {
//     const adminId = Number(req.query.adminId); // recommended

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required"
//       });
//     }

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         br.*,
//         m.fullName AS memberName,
//         c.className,
//         IFNULL(a.fullName, 'Pending') AS adminName,
//         b.name AS branchName
//       FROM booking_requests br
//       LEFT JOIN member m ON m.id = br.memberId
//       LEFT JOIN classschedule c ON c.id = br.classId
//       LEFT JOIN user a ON a.id = br.adminId
//       LEFT JOIN branch b ON b.id = br.branchId
//       WHERE br.adminId = ?
//       ORDER BY br.createdAt DESC
//       `,
//       [adminId]
//     );

//     res.json({ success: true, requests: rows });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getAllBookingRequests = async (req, res) => {
//   try {
//     const adminId = Number(req.query.adminId);

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required"
//       });
//     }

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         br.*,
//         m.fullName AS memberName,
//         c.className,
//         IFNULL(a.fullName, 'Pending') AS adminName
//       FROM booking_requests br
//       LEFT JOIN member m ON m.id = br.memberId
//       LEFT JOIN classschedule c ON c.id = br.classId
//       LEFT JOIN user a ON a.id = br.adminId
//       WHERE br.adminId = ?
//       ORDER BY br.createdAt DESC
//       `,
//       [adminId]
//     );

//     res.json({ success: true, requests: rows });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
/* --------------------------------------------------------
   APPROVE BOOKING (ADMIN)
-------------------------------------------------------- */
/* --------------------------------------------------------
   APPROVE BOOKING (ADMIN)
-------------------------------------------------------- */
export const approveBooking = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId } = req.body;   // ⭐ adminId payload se aa raha hai

    // Validate adminId
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required in the payload",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE booking_requests
      SET status = 'approved',
          adminId = ?,
          updatedAt = NOW()
      WHERE id = ?
      `,
      [adminId, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found",
      });
    }

    res.json({
      success: true,
      message: "Booking approved successfully",
    });

  } catch (err) {
    console.error("approveBooking Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const getBookingRequestsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        br.*,
        c.className,
        IFNULL(a.fullName, 'Pending') AS adminName
      FROM booking_requests br
      LEFT JOIN classschedule c ON c.id = br.classId
      LEFT JOIN user a ON a.id = br.adminId
      WHERE br.memberId = ?
      ORDER BY br.createdAt DESC
      `,
      [memberId]
    );

    res.json({
      success: true,
      requests: rows,
    });

  } catch (err) {
    console.error("getBookingRequestsByMember Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};




/* --------------------------------------------------------
   REJECT BOOKING (ADMIN)
-------------------------------------------------------- */
/* --------------------------------------------------------
   REJECT BOOKING (ADMIN)
-------------------------------------------------------- */
export const rejectBooking = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required in the payload",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE booking_requests
      SET status = 'rejected',
          adminId = ?,
          updatedAt = NOW()
      WHERE id = ?
      `,
      [adminId, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found",
      });
    }

    res.json({
      success: true,
      message: "Booking rejected successfully",
    });

  } catch (err) {
    console.error("rejectBooking Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getBookingRequestsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        br.*,
        m.fullName AS memberName,
        c.className,
        IFNULL(a.fullName, 'Pending') AS adminName
      FROM booking_requests br
      LEFT JOIN member m ON m.id = br.memberId
      LEFT JOIN classschedule c ON c.id = br.classId
      LEFT JOIN user a ON a.id = br.adminId
      WHERE br.branchId = ?
      ORDER BY br.createdAt DESC
      `,
      [branchId]
    );

    res.json({
      success: true,
      requests: rows,
    });

  } catch (err) {
    console.error("getBookingRequestsByBranch Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// export const getBookingRequestsByAdmin = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required",
//       });
//     }

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         br.*,
//         m.fullName AS memberName,
//         c.className,
//         IFNULL(a.fullName, 'Pending') AS adminName
//       FROM booking_requests br
//       LEFT JOIN member m ON m.id = br.memberId
//       LEFT JOIN classschedule c ON c.id = br.classId
//       LEFT JOIN user a ON a.id = br.adminId
//       WHERE br.adminId = ?
//       ORDER BY br.updatedAt DESC
//       `,
//       [adminId]
//     );

    

//     res.json({
//       success: true,
//       requests: rows,
//     });

//   } catch (err) {
//     console.error("getBookingRequestsByAdmin Error:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
export const getBookingRequestsByAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    /* -----------------------------------------
       1️⃣ APPROVED COUNT (THIS ADMIN ONLY)
    ------------------------------------------ */
    const [[approved]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM booking_requests
       WHERE adminId = ? AND status = 'approved'`,
      [adminId]
    );

    /* -----------------------------------------
       2️⃣ REJECTED COUNT (THIS ADMIN ONLY)
    ------------------------------------------ */
    const [[rejected]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM booking_requests
       WHERE adminId = ? AND status = 'rejected'`,
      [adminId]
    );

    /* -----------------------------------------
       3️⃣ PENDING COUNT (GLOBAL — adminId = NULL)
       👉 Pending requests kisi admin ko assign nahi hoti
    ------------------------------------------ */
    const [[pending]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM booking_requests
       WHERE status = 'pending'`
    );

    /* -----------------------------------------
       4️⃣ ALL APPROVED + REJECTED REQUESTS BY ADMIN
    ------------------------------------------ */
    const [rows] = await pool.query(
      `
      SELECT 
        br.*,
        m.fullName AS memberName,
        c.className,
        IFNULL(a.fullName, 'Pending') AS adminName
      FROM booking_requests br
      LEFT JOIN member m ON m.id = br.memberId
      LEFT JOIN classschedule c ON c.id = br.classId
      LEFT JOIN user a ON a.id = br.adminId
      WHERE br.adminId = ?
      ORDER BY br.updatedAt DESC
      `,
      [adminId]
    );

    /* -----------------------------------------
       5️⃣ FINAL RESPONSE
       👉 summary + requests BOTH return
    ------------------------------------------ */
    res.json({
      success: true,
      summary: {
        pending: pending.total,
        approved: approved.total,
        rejected: rejected.total,
      },
      requests: rows,
    });

  } catch (err) {
    console.error("getBookingRequestsByAdmin Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const createPTBooking = async (req, res) => {
  try {
    const {
      memberId,
      trainerId,
      sessionId,   // ⭐ NEW FIELD
      date,
      startTime,
      endTime,
      bookingStatus,
      paymentStatus,
      notes,
      branchId
    } = req.body;

    // VALIDATION
    if (!memberId || !trainerId || !sessionId || !date || !startTime || !endTime || !branchId) {
      return res.status(400).json({
        success: false,
        message: "memberId, trainerId, sessionId, date, time and branchId are required"
      });
    }

    await pool.query(
      `
      INSERT INTO pt_bookings 
      (memberId, trainerId, sessionId, date, startTime, endTime, bookingStatus, paymentStatus, notes, branchId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        memberId,
        trainerId,
        sessionId,        // ⭐ NEW DATA INSERT
        date,
        startTime,
        endTime,
        bookingStatus || "Booked",
        paymentStatus || "Pending",
        notes || "",
        branchId
      ]
    );

    res.json({
      success: true,
      message: "Personal training session booked successfully!"
    });

  } catch (err) {
    console.error("createPTBooking ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};




export const createGroupBooking = async (req, res) => {
  try {
    const {
      memberId,
      classId,
      date,
      startTime,
      endTime,
      bookingStatus,
      paymentStatus,
      notes,
      branchId
    } = req.body;

    if (!memberId || !classId || !date || !startTime || !endTime || !branchId) {
      return res.status(400).json({ success: false, message: "All required fields missing" });
    }

    await pool.query(
      `
      INSERT INTO group_class_bookings 
      (memberId, classId, date, startTime, endTime, bookingStatus, paymentStatus, notes, branchId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        memberId,
        classId,
        date,
        startTime,
        endTime,
        bookingStatus || "Booked",
        paymentStatus || "Pending",
        notes || "",
        branchId
      ]
    );

    res.json({
      success: true,
      message: "Group class booked successfully!"
    });

  } catch (err) {
    console.error("createGroupBooking ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getGroupBookingsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required"
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        g.*,
        m.fullName AS memberName,
        c.className
      FROM group_class_bookings g
      LEFT JOIN member m ON m.id = g.memberId
      LEFT JOIN classschedule c ON c.id = g.classId
      WHERE g.branchId = ?
      ORDER BY g.date DESC, g.startTime DESC
      `,
      [branchId]
    );

    res.json({
      success: true,
      bookings: rows,
    });

  } catch (err) {
    console.error("getGroupBookingsByBranch ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getPTBookingsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required"
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        p.*,

        -- Member details
        m.id AS memberId,
        um.fullName AS memberName,

        -- Trainer details
        t.id AS trainerId,
        ut.fullName AS trainerName,

        -- PT Session Name
        s.sessionName

      FROM pt_bookings p
      
      LEFT JOIN member m ON m.id = p.memberId
      LEFT JOIN user um ON um.id = m.userId      -- ⭐ Member full name from user table

      LEFT JOIN staff t ON t.id = p.trainerId
      LEFT JOIN user ut ON ut.id = t.userId      -- ⭐ Trainer full name from user table

      LEFT JOIN session s ON s.id = p.sessionId

      WHERE p.branchId = ?
      ORDER BY p.date DESC, p.startTime DESC
      `,
      [branchId]
    );

    res.json({
      success: true,
      bookings: rows,
    });

  } catch (err) {
    console.error("getPTBookingsByBranch ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getPTBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [[row]] = await pool.query(
      `
      SELECT 
        p.*,
        um.fullName AS memberName,
        ut.fullName AS trainerName,
        s.sessionName
      FROM pt_bookings p
      LEFT JOIN member m ON m.id = p.memberId
      LEFT JOIN user um ON um.id = m.userId
      LEFT JOIN staff t ON t.id = p.trainerId
      LEFT JOIN user ut ON ut.id = t.userId
      LEFT JOIN session s ON s.id = p.sessionId
      WHERE p.id = ?
      `,
      [bookingId]
    );

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "PT Booking not found",
      });
    }

    res.json({ success: true, booking: row });

  } catch (err) {
    console.error("getPTBookingById →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPTBookingsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        p.*,
        ut.fullName AS trainerName,
        s.sessionName
      FROM pt_bookings p
      LEFT JOIN staff t ON t.id = p.trainerId
      LEFT JOIN user ut ON ut.id = t.userId
      LEFT JOIN session s ON s.id = p.sessionId
      WHERE p.memberId = ?
      ORDER BY p.date DESC
      `,
      [memberId]
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("getPTBookingsByMember →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getPTBookingsByTrainer = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        p.*,
        um.fullName AS memberName,
        s.sessionName
      FROM pt_bookings p
      LEFT JOIN member m ON m.id = p.memberId
      LEFT JOIN user um ON um.id = m.userId
      LEFT JOIN session s ON s.id = p.sessionId
      WHERE p.trainerId = ?
      ORDER BY p.date DESC
      `,
      [trainerId]
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("getPTBookingsByTrainer →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const updatePTBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, startTime, endTime, bookingStatus, paymentStatus, notes } = req.body;

    const [result] = await pool.query(
      `
      UPDATE pt_bookings
      SET date = ?, startTime = ?, endTime = ?, bookingStatus = ?, paymentStatus = ?, notes = ?, updatedAt = NOW()
      WHERE id = ?
      `,
      [date, startTime, endTime, bookingStatus, paymentStatus, notes, bookingId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "PT Booking not found" });

    res.json({ success: true, message: "PT Booking updated" });

  } catch (err) {
    console.error("updatePTBooking →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deletePTBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [result] = await pool.query(
      `DELETE FROM pt_bookings WHERE id = ?`,
      [bookingId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "PT Booking not found" });

    res.json({ success: true, message: "PT Booking deleted" });

  } catch (err) {
    console.error("deletePTBooking →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getGroupBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [[row]] = await pool.query(
      `
      SELECT 
        g.*,
        m.fullName AS memberName,
        c.className
      FROM group_class_bookings g
      LEFT JOIN member m ON m.id = g.memberId
      LEFT JOIN classschedule c ON c.id = g.classId
      WHERE g.id = ?
      `,
      [bookingId]
    );

    if (!row)
      return res.status(404).json({ success: false, message: "Group booking not found" });

    res.json({ success: true, booking: row });

  } catch (err) {
    console.error("getGroupBookingById →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getGroupBookingsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        g.*,
        c.className
      FROM group_class_bookings g
      LEFT JOIN classschedule c ON c.id = g.classId
      WHERE g.memberId = ?
      ORDER BY g.date DESC
      `,
      [memberId]
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("getGroupBookingsByMember →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const updateGroupBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, startTime, endTime, bookingStatus, paymentStatus, notes } = req.body;

    const [result] = await pool.query(
      `
      UPDATE group_class_bookings
      SET date = ?, startTime = ?, endTime = ?, bookingStatus = ?, paymentStatus = ?, notes = ?, updatedAt = NOW()
      WHERE id = ?
      `,
      [date, startTime, endTime, bookingStatus, paymentStatus, notes, bookingId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "Group booking not found" });

    res.json({ success: true, message: "Group booking updated" });

  } catch (err) {
    console.error("updateGroupBooking →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deleteGroupBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [result] = await pool.query(
      `DELETE FROM group_class_bookings WHERE id = ?`,
      [bookingId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "Group booking not found" });

    res.json({ success: true, message: "Group booking deleted" });

  } catch (err) {
    console.error("deleteGroupBooking →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// unfied 


export const createUnifiedBooking = async (req, res) => {
  console.log("Unified Booking Bodyyyy:", req.body);

  try {
    const {
      memberId,
      trainerId,
      sessionId,
      classId,
      date,
      endDate,
      startTime,
      endTime,
      bookingType,
      notes,
      branchId = null,
      bookingStatus = "CONFIRMED",
      paymentStatus = "PENDING",
      price = 0
    } = req.body;

    /* =========================
       1️⃣ BASIC VALIDATION
    ========================= */
    if (!memberId || !date || !startTime || !endTime || !bookingType) {
      return res.status(400).json({
        success: false,
        message: "memberId, date, startTime, endTime, bookingType are required"
      });
    }

    /* =========================
       2️⃣ PT VALIDATION
    ========================= */
    if (bookingType === "PT") {
      if (!trainerId) {
        return res.status(400).json({
          success: false,
          message: "PT booking requires trainerId"
        });
      }
      if (!endDate) {
        return res.status(400).json({
          success: false,
          message: "PT booking requires endDate"
        });
      }
    }

    /* =========================
       3️⃣ GROUP VALIDATION
    ========================= */
    if (bookingType === "GROUP" && !classId) {
      return res.status(400).json({
        success: false,
        message: "Group booking requires classId"
      });
    }

    /* =========================
       4️⃣ 🔥 TRAINER AVAILABILITY CHECK
    ========================= */
    if (bookingType === "PT") {
      const [conflicts] = await pool.query(
        `
        SELECT id FROM unified_bookings
        WHERE trainerId = ?
          AND date = ?
          AND bookingType = 'PT'
          AND bookingStatus != 'CANCELLED'
          AND (
            startTime < ? AND endTime > ?
          )
        `,
        [trainerId, date, endTime, startTime]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Trainer is already booked for this time slot"
        });
      }
    }

    /* =========================
       5️⃣ CREATE BOOKING
    ========================= */
    const [result] = await pool.query(
      `
      INSERT INTO unified_bookings
      (memberId, trainerId, sessionId, classId, date, endDate,
       startTime, endTime, bookingType, bookingStatus,
       paymentStatus, price, notes, branchId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        memberId,
        trainerId || null,
        sessionId || null,
        classId || null,
        date,
        bookingType === "PT" ? endDate : null,
        startTime,
        endTime,
        bookingType,
        bookingStatus,
        paymentStatus,
        price,
        notes || "",
        branchId
      ]
    );

    try {
      // 1. Fetch Member Details
      const [mRows] = await pool.query("SELECT m.id, m.userId, m.adminId, u.fullName, u.email, u.phone FROM member m JOIN user u ON m.userId = u.id WHERE m.id = ?", [memberId]);
      
      if (mRows.length > 0) {
        const member = mRows[0];
        const adminUserId = member.adminId; // Typically admin's user ID
        
        // 2. Fetch Trainer Name
        let trainerName = "Trainer";
        if (trainerId) {
          const [tRows] = await pool.query("SELECT id, fullName FROM user WHERE id = ?", [trainerId]);
          if (tRows.length > 0) trainerName = tRows[0].fullName;
        }

        // 3. Dispatch Email to Member
        const msg = `Hi ${member.fullName},\n\nYour ${bookingType} booking on ${date} at ${startTime} has been successfully confirmed.`;
        dispatchNotification({
          category: "templates",
          toEmail: member.email,
          toPhone: member.phone,
          memberId: member.id,
          subject: "Class/Session Booking Confirmed",
          message: msg
        }).catch(err => console.error("Class Booking notification err:", err));

        // 4. In-App Notifications
        const bookingId = result.insertId;

        // A. Notify Member
        if (member.userId) {
          await sendAppNotification(member.userId, msg, {
            title: "Booking Confirmed",
            sender_id: adminUserId,
            reference_type: "BOOKING",
            reference_id: bookingId
          });
        }

        // B. Notify Admin
        const adminMsg = `New booking received from ${member.fullName}.`;
        await sendAppNotification(adminUserId, adminMsg, {
          title: "New Booking",
          sender_id: member.userId,
          reference_type: "BOOKING",
          reference_id: bookingId
        });

        // C. Notify Trainer
        if (trainerId) {
          const trainerMsg = `New member (${member.fullName}) booked your ${bookingType === 'PT' ? 'session' : 'class'}.`;
          await sendAppNotification(trainerId, trainerMsg, {
            title: "New Booking",
            sender_id: member.userId,
            reference_type: "BOOKING",
            reference_id: bookingId
          });
        }

        // D. Notify Receptionists (roleId = 7)
        // Find receptionists for this admin/branch
        const [receptionists] = await pool.query(
          "SELECT id FROM user WHERE roleId = 7 AND adminId = ?",
          [adminUserId]
        );
        for (let rec of receptionists) {
          const recMsg = `New ${bookingType === 'PT' ? 'session' : 'class'} booking received from ${member.fullName}.`;
          await sendAppNotification(rec.id, recMsg, {
            title: "New Booking",
            sender_id: member.userId,
            reference_type: "BOOKING",
            reference_id: bookingId
          });
        }

        // 5. Emit Socket Events for Real-time Dashboard Updates
        const io = getIO();
        if (io) {
          // Broad emit because Receptionists and Admins listen for these
          io.emit("bookingCreated");
          io.emit("capacityUpdated");
        }
      }
    } catch (err) {
      console.error("Failed to process booking notifications:", err);
    }

    res.json({
      success: true,
      message: "Booking created successfully"
    });

  } catch (err) {
    console.error("createUnifiedBooking ERROR →", err);
    res.status(500).json({
      success: false,
      message: "Failed to create booking"
    });
  }
};


// export const getUnifiedBookingsByBranch = async (req, res) => {
//   try {
//     const { branchId } = req.params;

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         b.*,
//         um.fullName AS memberName,
//         ut.fullName AS trainerName,
//         s.sessionName,
//         c.className
//       FROM unified_bookings b
//       LEFT JOIN member m ON m.id = b.memberId
//       LEFT JOIN user um ON um.id = m.userId

//       LEFT JOIN staff t ON t.id = b.trainerId
//       LEFT JOIN user ut ON ut.id = t.userId

//       LEFT JOIN session s ON s.id = b.sessionId
//       LEFT JOIN classschedule c ON c.id = b.classId

//       WHERE b.branchId = ?
//       ORDER BY b.date DESC, b.startTime DESC
//       `,
//       [branchId]
//     );

//     res.json({ success: true, bookings: rows });

//   } catch (err) {
//     console.error("getUnifiedBookingsByBranch ERROR →", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getUnifiedBookingsByBranch = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         b.*,
//         um.fullName AS memberName,
//         ut.fullName AS trainerName,
//         s.sessionName,
//         c.className
//       FROM unified_bookings b
      
//       -- Member Details Join
//       LEFT JOIN member m ON m.id = b.memberId
//       LEFT JOIN user um ON um.id = m.userId
      
//       /******************************************************
//        * TRAINER JOIN UPDATED  
//        * Pehle hum staff table join kar rahe the:
//        *   LEFT JOIN staff t ON t.id = b.trainerId
//        *   LEFT JOIN user ut ON ut.id = t.userId
//        *
//        * Lekin ab trainerId = user table ki ID hai,
//        * isliye direct user table se join kiya hai.
//        ******************************************************/
//       LEFT JOIN user ut ON ut.id = b.trainerId

//       -- Session & Class Join
//       LEFT JOIN session s ON s.id = b.sessionId
//       LEFT JOIN classschedule c ON c.id = b.classId

//       WHERE b.branchId = ?
//       ORDER BY b.date DESC, b.startTime DESC
//       `,
//       [branchId]
//     );

//     res.json({ success: true, bookings: rows });

//   } catch (err) {
//     console.error("getUnifiedBookingsByBranch ERROR →", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
export const getUnifiedBookingsByBranch = async (req, res) => {
  try {
    const { adminId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        b.id,

        -- ✅ SAME DATE LOGIC (NO CONVERT_TZ)
        DATE_FORMAT(b.date, '%Y-%m-%d') AS date,
        DATE_FORMAT(b.endDate, '%Y-%m-%d') AS endDate,

        b.startTime,
        b.endTime,
        b.bookingType,
        b.bookingStatus,
        b.paymentStatus,
        b.price,
        b.notes,
        b.branchId,

        um.fullName AS memberName,
        ut.fullName AS trainerName,
        s.sessionName,
        c.className

      FROM unified_bookings b
      LEFT JOIN member m ON m.id = b.memberId
      LEFT JOIN user um ON um.id = m.userId
      LEFT JOIN user ut ON ut.id = b.trainerId
      LEFT JOIN session s ON s.id = b.sessionId
      LEFT JOIN classschedule c ON c.id = b.classId

      WHERE m.adminId = ?
      ORDER BY b.date DESC, b.startTime DESC
      `,
      [adminId]
    );

    res.json({
      success: true,
      bookings: rows
    });

  } catch (err) {
    console.error("getUnifiedBookingsByBranch ERROR →", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};




export const getUnifiedBookingsByTrainer = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        b.*,
        m.fullName AS memberName,
        s.sessionName
      FROM unified_bookings b
      LEFT JOIN member m ON m.id = b.memberId
      LEFT JOIN user um ON um.id = m.userId
      LEFT JOIN session s ON s.id = b.sessionId
      WHERE b.trainerId = ? AND b.bookingType = 'PT'
      ORDER BY b.date DESC
      `,
      [trainerId]
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const getUnifiedPersonalAndGeneralTrainersService = async (req,res) => {
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
// export const getUnifiedPersonalAndGeneralTrainersService = async (req, res) => {
//   try {
//     // adminId should come from auth middleware or params/query
//     const adminId = Number(req.user?.adminId || req.params.adminId);

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required"
//       });
//     }

//     const [rows] = await pool.query(
//   `
//   SELECT 
//     u.id,
//     u.fullName,
//     u.email,
//     u.phone,
//     u.branchId,
//     u.roleId
//   FROM user u
//   WHERE u.roleId IN (5, 6)
//     AND u.adminId = ?
//     AND NOT EXISTS (
//       SELECT 1
//       FROM unified_bookings b
//       WHERE b.trainerId = u.id
//         AND b.bookingType = 'PT'
//         AND b.bookingStatus = 'Booked'
//         AND b.paymentStatus = 'Paid'
//     )
//   ORDER BY u.id DESC
//   `,
//   [adminId]
// );

//     return res.status(200).json({
//       success: true,
//       trainers: rows
//     });

//   } catch (error) {
//     console.error("getUnifiedPersonalAndGeneralTrainersService ERROR →", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

export const getUnifiedPersonalAndGeneralTrainersService = async (req, res) => {
  try {
    const adminId = Number(req.user?.adminId || req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required"
      });
    }

    /* 1️⃣ GET TRAINERS */
    const [trainers] = await pool.query(
      `
      SELECT 
        u.id,
        u.fullName,
        u.phone,
        u.roleId
      FROM user u
      WHERE u.roleId IN (5, 6)
        AND u.adminId = ?
      ORDER BY u.id DESC
      `,
      [adminId]
    );

    /* 2️⃣ GET TODAY + FUTURE BOOKINGS (FIXED) */
    const [bookings] = await pool.query(
      `
      SELECT
        b.trainerId,
        b.bookingType,
        DATE_FORMAT(b.date, '%Y-%m-%d') AS date,
        b.startTime,
        b.endTime
      FROM unified_bookings b
      WHERE b.trainerId IS NOT NULL
        AND b.bookingStatus = 'Booked'
        AND TIMESTAMP(b.date, b.endTime) >= NOW()
      `
    );

    /* 3️⃣ MAP TRAINERS */
    const response = trainers.map(trainer => {
      const trainerBookings = bookings.filter(
        b => b.trainerId === trainer.id
      );

      return {
        trainerId: trainer.id,
        name: trainer.fullName,
        phone: trainer.phone,
        roleId: trainer.roleId,

        isBooked: trainerBookings.length > 0,

        bookedSlots: trainerBookings.map(b => ({
          type: b.bookingType,
          date: b.date,          // ✅ CORRECT DATE
          startTime: b.startTime,
          endTime: b.endTime
        })),

        availability:
          trainerBookings.length > 0
            ? "PARTIALLY BOOKED"
            : "AVAILABLE"
      };
    });

    return res.status(200).json({
      success: true,
      trainers: response
    });

  } catch (error) {
    console.error("getUnifiedPersonalAndGeneralTrainersService ERROR →", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};





export const getUnifiedBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        b.*,
        ut.fullName AS trainerName,       -- trainer name
        s.sessionName,                    -- session name (for PT)
        cs.className                      -- class name (for GROUP)
      FROM unified_bookings b
      LEFT JOIN staff t ON t.id = b.trainerId
      LEFT JOIN user ut ON ut.id = t.userId
      LEFT JOIN session s ON s.id = b.sessionId
      LEFT JOIN classschedule cs ON cs.id = b.classId   -- class name yahi se aata hai
      WHERE b.id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      booking: rows[0],
    });

  } catch (err) {
    console.error("getUnifiedBookingById ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// export const updateUnifiedBooking = async (req, res) => {
//   try {
//     const { bookingId } = req.params;
//     const { date, startTime, endTime, bookingStatus, paymentStatus, notes } = req.body;

//     const [result] = await pool.query(
//       `
//       UPDATE unified_bookings
//       SET date=?, startTime=?, endTime=?, bookingStatus=?, paymentStatus=?, notes=?, updatedAt=NOW()
//       WHERE id=?
//       `,
//       [date, startTime, endTime, bookingStatus, paymentStatus, notes, bookingId]
//     );

//     if (!result.affectedRows)
//       return res.status(404).json({ success: false, message: "Booking not found" });

//     res.json({ success: true, message: "Booking updated!" });

//   } catch (err) {
//     console.error("ERROR →", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


// export const updateUnifiedBooking = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "Booking ID is required",
//       });
//     }

//     const {
//       trainerId,
//       sessionId,
//       classId,
//       date,
//       startTime,
//       endTime,
//       bookingType,
//       bookingStatus,
//       paymentStatus,
//       notes,
//     } = req.body;

//     // Build dynamic SET query
//     let fields = [];
//     let params = [];

//     if (trainerId !== undefined) {
//       fields.push("trainerId = ?");
//       params.push(trainerId);
//     }
//     if (sessionId !== undefined) {
//       fields.push("sessionId = ?");
//       params.push(sessionId);
//     }
//     if (classId !== undefined) {
//       fields.push("classId = ?");
//       params.push(classId);
//     }
//     if (date !== undefined) {
//       fields.push("date = ?");
//       params.push(date);
//     }
//     if (startTime !== undefined) {
//       fields.push("startTime = ?");
//       params.push(startTime);
//     }
//     if (endTime !== undefined) {
//       fields.push("endTime = ?");
//       params.push(endTime);
//     }
//     if (bookingType !== undefined) {
//       fields.push("bookingType = ?");
//       params.push(bookingType);
//     }
//     if (bookingStatus !== undefined) {
//       fields.push("bookingStatus = ?");
//       params.push(bookingStatus);
//     }
//     if (paymentStatus !== undefined) {
//       fields.push("paymentStatus = ?");
//       params.push(paymentStatus);
//     }
//     if (notes !== undefined) {
//       fields.push("notes = ?");
//       params.push(notes);
//     }

//     if (fields.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one field is required to update",
//       });
//     }

//     params.push(id);

//     const updateQuery = `
//       UPDATE unified_bookings
//       SET ${fields.join(", ")}
//       WHERE id = ?
//     `;

//     const [result] = await pool.query(updateQuery, params);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Booking not found",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Booking updated successfully",
//     });

//   } catch (err) {
//     console.error("updateUnifiedBooking ERROR →", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

export const updateUnifiedBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const {
      trainerId,
      sessionId,
      classId,
      date,
      endDate,
      startTime,
      endTime,
      bookingType,
      bookingStatus,
      paymentStatus,
      price,
      notes,
      branchId
    } = req.body;

    // -------------------------
    // BUSINESS VALIDATION
    // -------------------------
    // if (bookingType === "PT") {
    //   if (trainerId === null) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "PT booking requires trainerId",
    //     });
    //   }
    //   if (endDate === null) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "PT booking requires endDate",
    //     });
    //   }
    // }

    // if (bookingType === "GROUP" && classId === null) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Group booking requires classId",
    //   });
    // }

    // -------------------------
    // DYNAMIC UPDATE
    // -------------------------
    let fields = [];
    let params = [];

    if (trainerId !== undefined) {
      fields.push("trainerId = ?");
      params.push(trainerId);
    }
    if (sessionId !== undefined) {
      fields.push("sessionId = ?");
      params.push(sessionId);
    }
    if (classId !== undefined) {
      fields.push("classId = ?");
      params.push(classId);
    }
    if (date !== undefined) {
      fields.push("date = ?");
      params.push(date);
    }
    if (endDate !== undefined) {
      fields.push("endDate = ?");
      params.push(endDate);
    }
    if (startTime !== undefined) {
      fields.push("startTime = ?");
      params.push(startTime);
    }
    if (endTime !== undefined) {
      fields.push("endTime = ?");
      params.push(endTime);
    }
    if (bookingType !== undefined) {
      fields.push("bookingType = ?");
      params.push(bookingType);
    }
    if (bookingStatus !== undefined) {
      fields.push("bookingStatus = ?");
      params.push(bookingStatus);
    }
    if (paymentStatus !== undefined) {
      fields.push("paymentStatus = ?");
      params.push(paymentStatus);
    }
    if (price !== undefined) {
      fields.push("price = ?");
      params.push(price);
    }
    if (notes !== undefined) {
      fields.push("notes = ?");
      params.push(notes);
    }
    if (branchId !== undefined) {
      fields.push("branchId = ?");
      params.push(branchId);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required to update",
      });
    }

    params.push(id);

    const updateQuery = `
      UPDATE unified_bookings
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    const [result] = await pool.query(updateQuery, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    try {
      // 1. Fetch updated booking details to notify relevant users
      const [bRows] = await pool.query(
        "SELECT b.memberId, b.trainerId, b.bookingType, b.date, b.startTime, m.adminId, m.userId AS memberUserId, u.fullName AS memberName FROM unified_bookings b JOIN member m ON b.memberId = m.id JOIN user u ON m.userId = u.id WHERE b.id = ?",
        [id]
      );

      if (bRows.length > 0) {
        const booking = bRows[0];
        const adminUserId = booking.adminId;
        
        const updateMsg = `Booking update: Your ${booking.bookingType} booking on ${booking.date} at ${booking.startTime} has been updated.`;
        
        // A. Notify Member
        if (booking.memberUserId) {
          await sendAppNotification(booking.memberUserId, updateMsg, {
            title: "Booking Updated",
            sender_id: adminUserId,
            reference_type: "BOOKING",
            reference_id: id
          });
        }
        
        // B. Notify Admin
        await sendAppNotification(adminUserId, `Booking for ${booking.memberName} was updated.`, {
          title: "Booking Updated",
          sender_id: booking.memberUserId,
          reference_type: "BOOKING",
          reference_id: id
        });

        // C. Notify Trainer
        if (booking.trainerId) {
          await sendAppNotification(booking.trainerId, `Booking for ${booking.memberName} was updated.`, {
            title: "Booking Updated",
            sender_id: booking.memberUserId,
            reference_type: "BOOKING",
            reference_id: id
          });
        }

        // D. Notify Receptionists
        const [receptionists] = await pool.query(
          "SELECT id FROM user WHERE roleId = 7 AND adminId = ?",
          [adminUserId]
        );
        for (let rec of receptionists) {
          await sendAppNotification(rec.id, `Booking for ${booking.memberName} was updated.`, {
            title: "Booking Updated",
            sender_id: booking.memberUserId,
            reference_type: "BOOKING",
            reference_id: id
          });
        }

        // Emit Socket Event
        const io = getIO();
        if (io) io.emit("bookingUpdated");
      }
    } catch (err) {
      console.error("Failed to process booking update notifications:", err);
    }

    return res.json({
      success: true,
      message: "Booking updated successfully",
    });

  } catch (err) {
    console.error("updateUnifiedBooking ERROR →", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const deleteUnifiedBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (String(bookingId).startsWith('M-')) {
      const memberId = bookingId.split('-')[1];
      const [result] = await pool.query(
        `UPDATE member SET trainerId = NULL WHERE id = ?`,
        [memberId]
      );
      if (!result.affectedRows)
        return res.status(404).json({ success: false, message: "Member not found" });
      return res.json({ success: true, message: "Trainer assignment removed!" });
    }

    // 1. Fetch booking details BEFORE deletion for notifications
    let bookingToNotify = null;
    try {
      const [bRows] = await pool.query(
        "SELECT b.memberId, b.trainerId, b.bookingType, b.date, b.startTime, m.adminId, m.userId AS memberUserId, u.fullName AS memberName FROM unified_bookings b JOIN member m ON b.memberId = m.id JOIN user u ON m.userId = u.id WHERE b.id = ?",
        [bookingId]
      );
      if (bRows.length > 0) bookingToNotify = bRows[0];
    } catch (err) {
      console.error("Failed to pre-fetch booking for delete notifications:", err);
    }

    const [result] = await pool.query(
      `DELETE FROM unified_bookings WHERE id = ?`,
      [bookingId]
    );

    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: "Booking not found" });

    // 2. Dispatch Notifications and Socket Events AFTER deletion
    if (bookingToNotify) {
      try {
        const adminUserId = bookingToNotify.adminId;
        const cancelMsg = `Booking cancellation: The ${bookingToNotify.bookingType} booking on ${bookingToNotify.date} at ${bookingToNotify.startTime} has been cancelled.`;

        // A. Notify Member
        if (bookingToNotify.memberUserId) {
          await sendAppNotification(bookingToNotify.memberUserId, cancelMsg, {
            title: "Booking Cancelled",
            sender_id: adminUserId,
            reference_type: "BOOKING",
            reference_id: bookingId
          });
        }

        // B. Notify Admin
        await sendAppNotification(adminUserId, `Booking for ${bookingToNotify.memberName} was cancelled.`, {
          title: "Booking Cancelled",
          sender_id: bookingToNotify.memberUserId,
          reference_type: "BOOKING",
          reference_id: bookingId
        });

        // C. Notify Trainer
        if (bookingToNotify.trainerId) {
          await sendAppNotification(bookingToNotify.trainerId, `Booking for ${bookingToNotify.memberName} was cancelled.`, {
            title: "Booking Cancelled",
            sender_id: bookingToNotify.memberUserId,
            reference_type: "BOOKING",
            reference_id: bookingId
          });
        }

        // D. Notify Receptionists
        const [receptionists] = await pool.query(
          "SELECT id FROM user WHERE roleId = 7 AND adminId = ?",
          [adminUserId]
        );
        for (let rec of receptionists) {
          await sendAppNotification(rec.id, `Booking for ${bookingToNotify.memberName} was cancelled.`, {
            title: "Booking Cancelled",
            sender_id: bookingToNotify.memberUserId,
            reference_type: "BOOKING",
            reference_id: bookingId
          });
        }

        // Emit Socket Events
        const io = getIO();
        if (io) {
          io.emit("bookingCancelled");
          io.emit("capacityUpdated");
        }
      } catch (err) {
        console.error("Failed to process delete booking notifications:", err);
      }
    }

    res.json({ success: true, message: "Booking deleted!" });

  } catch (err) {
    console.error("ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getUnifiedBookingsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        b.*,
        ut.fullName AS trainerName,
        s.sessionName,
        c.className
      FROM unified_bookings b
      LEFT JOIN staff t ON t.id = b.trainerId
      LEFT JOIN user ut ON ut.id = t.userId
      LEFT JOIN session s ON s.id = b.sessionId
      LEFT JOIN classschedule c ON c.id = b.classId
      WHERE b.memberId = ?
      ORDER BY b.date DESC
      `,
      [memberId]
    );

    res.json({
      success: true,
      bookings: rows,
    });

  } catch (err) {
    console.error("getUnifiedBookingsByMember ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const getPTBookingsByAdminId = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     // 1️⃣ Check admin exist & get his branch
//     const [adminData] = await pool.query(
//       `SELECT branchId FROM user WHERE id = ? LIMIT 1`,
//       [adminId]
//     );

//     if (adminData.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin not found"
//       });
//     }

//     const branchId = adminData[0].branchId;

//     // 2️⃣ Get all bookings based on branch
//     const [bookings] = await pool.query(
//       `
//       SELECT 
//         ub.*,
//         m.fullName AS memberName,
//         t.fullName AS trainerName
//       FROM unified_bookings ub
//       LEFT JOIN user m ON m.id = ub.memberId
//       LEFT JOIN user t ON t.id = ub.trainerId
//       WHERE ub.branchId = ?
//       ORDER BY ub.date DESC
//       `,
//       [branchId]
//     );

//     return res.json({
//       success: true,
//       total: bookings.length,
//       data: bookings
//     });

//   } catch (error) {
//     console.log("Error fetching bookings:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };

// export const getPTBookingsByAdminId = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     // 1️⃣ Check admin exist & get his branch
//     const [adminData] = await pool.query(
//       `SELECT branchId FROM user WHERE id = ? LIMIT 1`,
//       [adminId]
//     );

//     if (adminData.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin not found"
//       });
//     }

//     const branchId = adminData[0].branchId;

//     // 2️⃣ Get ONLY PT bookings for admin's branch
//     const [bookings] = await pool.query(
//       `
//       SELECT 
//         ub.*,
//         m.fullName AS memberName,
//         t.fullName AS trainerName
//       FROM unified_bookings ub
//       LEFT JOIN member m ON m.id = ub.memberId
//       LEFT JOIN user t ON t.id = ub.trainerId
//       WHERE ub.branchId = ?
//       AND ub.bookingType = 'PT'
//       ORDER BY ub.date DESC
//       `,
//       [branchId]
//     );

//     return res.json({
//       success: true,
//       total: bookings.length,
//       data: bookings
//     });

//   } catch (error) {
//     console.log("Error fetching PT bookings:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };

export const getPTBookingsByAdminId = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required"
      });
    }

    const [bookings] = await pool.query(
      `
      SELECT 
        ub.id AS id,
        ub.memberId,
        ub.trainerId,
        ub.sessionId,
        ub.classId,
        ub.date,
        ub.endDate,
        ub.startTime,
        ub.endTime,
        ub.bookingType,
        ub.bookingStatus,
        ub.paymentStatus,
        ub.price,
        NULL AS time,
        ub.notes,
        ub.branchId,
        ub.createdAt,
        ub.updatedAt,
        m.fullName AS memberName,
        IFNULL(t.fullName, 'Deleted Trainer') AS trainerName,
        s.sessionName
      FROM unified_bookings ub
      LEFT JOIN member m ON m.id = ub.memberId
      LEFT JOIN user t ON t.id = ub.trainerId
      LEFT JOIN session s ON s.id = ub.sessionId
      WHERE ub.bookingType = 'PT'
        AND (
          s.adminId = ?
          OR ub.trainerId IN (
            SELECT id FROM user WHERE adminId = ?
          )
        )

      UNION ALL

      SELECT
        CONCAT('M-', m.id) AS id,
        m.id AS memberId,
        m.trainerId AS trainerId,
        NULL AS sessionId,
        NULL AS classId,
        m.joinDate AS date,
        m.membershipTo AS endDate,
        NULL AS startTime,
        NULL AS endTime,
        'PT' AS bookingType,
        'Assigned' AS bookingStatus,
        'Completed' AS paymentStatus,
        IFNULL(p.price, m.amountPaid) AS price,
        TIME_FORMAT(m.joinDate, '%h:%i %p') AS time,
        'PT Assigned from Profile' AS notes,
        m.branchId AS branchId,
        m.joinDate AS createdAt,
        m.joinDate AS updatedAt,
        m.fullName AS memberName,
        IFNULL(t.fullName, 'Deleted Trainer') AS trainerName,
        'Assigned PT' AS sessionName
      FROM member m
      LEFT JOIN user t ON t.id = m.trainerId
      LEFT JOIN plan p ON p.id = m.planId
      WHERE m.adminId = ?
        AND m.trainerId IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM unified_bookings ub 
          WHERE ub.memberId = m.id AND ub.bookingType = 'PT'
        )
      ORDER BY date DESC
      `,
      [adminId, adminId, adminId]
    );

    return res.json({
      success: true,
      total: bookings.length,
      data: bookings
    });

  } catch (error) {
    console.error("Error fetching PT bookings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



// ➤ GET BOOKING DETAILS FOR ADMIN/TRAINER
export const getBookingDetails = async (req, res) => {
  try {
    const { adminId, trainerId } = req.params;
    const { type } = req.query; // 'class' or 'session'

    let query = `
      SELECT 
        ub.id,
        ub.memberId,
        m.fullName AS memberName,
        m.phone AS memberPhone,
        m.email AS memberEmail,
        ub.date,
        ub.startTime,
        ub.endTime,
        ub.bookingStatus,
        ub.createdAt,
        ub.bookingType,
        ub.classId,
        COALESCE(c.className, ub.notes, ub.bookingType) AS class_name,
        ub.sessionId,
        COALESCE(s.sessionName, ub.notes) AS sessionName
      FROM unified_bookings ub
      JOIN member m ON ub.memberId = m.id
      LEFT JOIN classschedule c ON ub.classId = c.id
      LEFT JOIN session s ON ub.sessionId = s.id
      WHERE m.adminId = ?
    `;
    
    const params = [adminId];

    if (trainerId) {
      query += ' AND (ub.trainerId = ? OR c.trainerId = ? OR s.trainerId = ?)';
      params.push(trainerId, trainerId, trainerId);
    }

    if (type === 'class' || type === 'classes') {
      query += ' AND ub.classId IS NOT NULL';
    } else if (type === 'session' || type === 'sessions') {
      query += ' AND ub.sessionId IS NOT NULL';
    }

    query += ' ORDER BY ub.createdAt DESC';

    const [rows] = await pool.query(query, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking details' });
  }
};

