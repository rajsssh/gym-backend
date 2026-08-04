import { pool } from "../../config/db.js";

const LATE_CHECKIN_HOUR = 9;
export const getGroupTrainingPlansWithMembersService = async (adminId) => {
  if (!adminId) throw { status: 400, message: "Admin ID is required" };

  // Get all group training plans for this branch
  const [groupPlans] = await pool.query(
    "SELECT * FROM memberplan WHERE type = 'GROUP' ORDER BY price ASC"
  );

  // For each plan, get the members assigned to this branch
  const plansWithMembers = await Promise.all(
    groupPlans.map(async (plan) => {
      // Find members who have purchased this plan and belong to this branch
      const [membersWithBookings] = await pool.query(
        `
  SELECT m.*, p.paymentDate, p.invoiceNo
  FROM member m
  LEFT JOIN (
      SELECT p1.memberId, p1.paymentDate, p1.invoiceNo
      FROM payment p1
      JOIN (
          SELECT memberId, MAX(paymentDate) AS latestPayment
          FROM payment
          WHERE planId = ?
          GROUP BY memberId
      ) p2 
      ON p1.memberId = p2.memberId AND p1.paymentDate = p2.latestPayment
      WHERE p1.planId = ?
  ) p ON m.id = p.memberId
  WHERE m.planId = ? AND m.adminId = ?
`,
        [plan.id, plan.id, plan.id, adminId]
      );

      // Get booking counts for each member (with any trainer in this branch)
      const memberIds = membersWithBookings.map((m) => m.id);
      let bookingCounts = {};

      if (memberIds.length > 0) {
        const [bookingResults] = await pool.query(
          `
          SELECT b.memberId, COUNT(*) as bookingCount
          FROM booking b
          JOIN classschedule cs ON b.scheduleId = cs.id
          JOIN user u ON cs.trainerId = u.id
          WHERE b.memberId IN (${memberIds.join(",")}) AND u.adminId = ?
          GROUP BY b.memberId
        `,
          [adminId]
        );

        bookingResults.forEach((result) => {
          bookingCounts[result.memberId] = result.bookingCount;
        });
      }

      // Calculate member details for display
      const memberDetails = membersWithBookings.map((member) => {
        const totalBookings = bookingCounts[member.id] || 0;
        const remainingSessions = plan.sessions - totalBookings;

        // Determine status based on expiry date and remaining sessions
        const today = new Date();
        const membershipTo = member.membershipTo
          ? new Date(member.membershipTo)
          : null;
        let memberStatus = "Active";

        if (membershipTo && today > membershipTo) {
          memberStatus = "Expired";
        } else if (remainingSessions <= 0) {
          memberStatus = "Sessions Completed";
        }

        return {
          id: member.id,
          name: member.fullName,
          purchaseDate: member.paymentDate
            ? member.paymentDate.toISOString().split("T")[0]
            : "",
          expiryDate: member.membershipTo
            ? member.membershipTo.toISOString().split("T")[0]
            : "",
          bookedSessions: totalBookings,
          remainingSessions: remainingSessions > 0 ? remainingSessions : 0,
          status: memberStatus,
        };
      });

      return {
        planId: plan.id,
        planName: plan.name,
        sessions: plan.sessions,
        validityDays: plan.validityDays,
        price: plan.price,
        totalMembers: memberDetails.length,
        members: memberDetails,
      };
    })
  );

  return plansWithMembers;
};

export const getMembersForPlanService = async (branchId, planId) => {
  if (!branchId) throw { status: 400, message: "Branch ID is required" };
  if (!planId) throw { status: 400, message: "Plan ID is required" };

  // Get the plan details
  const [planResults] = await pool.query(
    "SELECT * FROM memberplan WHERE id = ? AND type = 'GROUP'",
    [planId]
  );

  if (planResults.length === 0)
    throw { status: 404, message: "Group plan not found" };

  const plan = planResults[0];

  // Find members who have purchased this plan and belong to this branch
  const [membersWithBookings] = await pool.query(
    `
    SELECT m.*, p.paymentDate, p.invoiceNo
    FROM member m
    LEFT JOIN (
      SELECT memberId, MAX(paymentDate) as paymentDate, invoiceNo
      FROM payment 
      WHERE planId = ?
      GROUP BY memberId
    ) p ON m.id = p.memberId
    WHERE m.planId = ? AND m.branchId = ?
  `,
    [planId, planId, branchId]
  );

  // Get booking counts for each member (with any trainer in this branch)
  const memberIds = membersWithBookings.map((m) => m.id);
  let bookingCounts = {};

  if (memberIds.length > 0) {
    const [bookingResults] = await pool.query(
      `
      SELECT b.memberId, COUNT(*) as bookingCount
      FROM Booking b
      JOIN ClassSchedule cs ON b.scheduleId = cs.id
      JOIN User u ON cs.trainerId = u.id
      WHERE b.memberId IN (${memberIds.join(",")}) AND u.branchId = ?
      GROUP BY b.memberId
    `,
      [branchId]
    );

    bookingResults.forEach((result) => {
      bookingCounts[result.memberId] = result.bookingCount;
    });
  }

  // Calculate member details for display
  const memberDetails = membersWithBookings.map((member) => {
    const totalBookings = bookingCounts[member.id] || 0;
    const remainingSessions = plan.sessions - totalBookings;

    // Determine status based on expiry date and remaining sessions
    const today = new Date();
    const membershipTo = member.membershipTo
      ? new Date(member.membershipTo)
      : null;
    let memberStatus = "Active";

    if (membershipTo && today > membershipTo) {
      memberStatus = "Expired";
    } else if (remainingSessions <= 0) {
      memberStatus = "Sessions Completed";
    }

    return {
      id: member.id,
      name: member.fullName,
      email: member.email,
      phone: member.phone,
      purchaseDate: member.paymentDate
        ? member.paymentDate.toISOString().split("T")[0]
        : "",
      expiryDate: member.membershipTo
        ? member.membershipTo.toISOString().split("T")[0]
        : "",
      bookedSessions: totalBookings,
      remainingSessions: remainingSessions > 0 ? remainingSessions : 0,
      status: memberStatus,
    };
  });

  return {
    planId: plan.id,
    planName: plan.name,
    sessions: plan.sessions,
    validityDays: plan.validityDays,
    price: plan.price,
    totalMembers: memberDetails.length,
    members: memberDetails,
  };
};

export const getMemberBookingDetailsService = async (branchId, memberId) => {
  if (!branchId) throw { status: 400, message: "Branch ID is required" };
  if (!memberId) throw { status: 400, message: "Member ID is required" };

  // Get member details
  const [memberResults] = await pool.query(
    `
    SELECT m.*, p.name as planName, p.sessions as planSessions, p.validityDays as planValidityDays, p.price as planPrice
    FROM member m
    LEFT JOIN memberplan p ON m.planId = p.id
    WHERE m.id = ? AND m.branchId = ?
  `,
    [memberId, branchId]
  );

  if (memberResults.length === 0)
    throw { status: 404, message: "Member not found" };

  const member = memberResults[0];

  // Get member bookings with trainers from this branch
  const [bookingResults] = await pool.query(
    `
    SELECT b.id, cs.date, cs.startTime, cs.endTime, ct.name as className, u.fullName as trainerName
    FROM Booking b
    JOIN classschedule cs ON b.scheduleId = cs.id
    JOIN classtype ct ON cs.classTypeId = ct.id
    JOIN user u ON cs.trainerId = u.id
    WHERE b.memberId = ? AND u.branchId = ?
    ORDER BY cs.date DESC
  `,
    [memberId, branchId]
  );

  // Get member payments
  const [paymentResults] = await pool.query(
    `
    SELECT id, amount, paymentDate, invoiceNo
    FROM payment
    WHERE memberId = ?
    ORDER BY paymentDate DESC
  `,
    [memberId]
  );

  // Calculate booking statistics
  const totalBookings = bookingResults.length;
  const totalSessions = member.planSessions || 0;
  const remainingSessions = totalSessions - totalBookings;

  // Calculate progress percentage
  const progress =
    totalSessions > 0 ? Math.round((totalBookings / totalSessions) * 100) : 0;

  // Determine status
  const today = new Date();
  const membershipTo = member.membershipTo
    ? new Date(member.membershipTo)
    : null;
  let status = "Active";

  if (membershipTo && today > membershipTo) {
    status = "Expired";
  } else if (remainingSessions <= 0) {
    status = "Sessions Completed";
  }

  // Format booking details
  const bookingDetails = bookingResults.map((booking) => ({
    id: booking.id,
    date: booking.date.toISOString().split("T")[0],
    time: `${booking.startTime} - ${booking.endTime}`,
    className: booking.className,
    trainerName: booking.trainerName,
    status: today > new Date(booking.date) ? "Completed" : "Upcoming",
  }));

  return {
    member: {
      id: member.id,
      name: member.fullName,
      email: member.email,
      phone: member.phone,
      status: status,
      purchaseDate:
        paymentResults.length > 0
          ? paymentResults[0].paymentDate.toISOString().split("T")[0]
          : "",
      expiryDate: member.membershipTo
        ? member.membershipTo.toISOString().split("T")[0]
        : "",
    },
    sessionDetails: {
      attended: totalBookings,
      remaining: remainingSessions > 0 ? remainingSessions : 0,
      total: totalSessions,
      progress: progress,
    },
    plan: member.planName
      ? {
          id: member.planId,
          name: member.planName,
          sessions: member.planSessions,
          validityDays: member.planValidityDays,
          price: member.planPrice,
        }
      : null,
    bookings: bookingDetails,
    payments: paymentResults.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.paymentDate.toISOString().split("T")[0],
      invoiceNo: payment.invoiceNo,
    })),
  };
};

// export const getClassPerformanceReportService = async (branchId) => {
//   if (!branchId) throw { status: 400, message: "Branch ID is required" };

//   // Get total students count for this branch
//   const [totalStudentsResult] = await pool.query(
//     "SELECT COUNT(*) as count FROM member WHERE branchId = ? AND status = 'ACTIVE'",
//     [branchId]
//   );
//   const totalStudents = totalStudentsResult[0].count;

//   // Get present students count for today
//   const today = new Date().toISOString().split("T")[0];
//   const [presentStudentsResult] = await pool.query(
//     "SELECT COUNT(DISTINCT memberId) as count FROM memberattendance WHERE branchId = ? AND DATE(checkIn) = ?",
//     [branchId, today]
//   );
//   const presentStudents = presentStudentsResult[0].count;

//   // Calculate average attendance percentage
//   const avgAttendance =
//     totalStudents > 0
//       ? Math.round((presentStudents / totalStudents) * 100 * 10) / 10
//       : 0;

//   // Get student attendance by class data (last 7 days)
//   const [studentAttendanceByClass] = await pool.query(
//     `
//     SELECT
//       ct.name as className,
//       cs.date,
//       COUNT(DISTINCT b.memberId) as attendanceCount,
//       cs.capacity,
//       ROUND(COUNT(DISTINCT b.memberId) / cs.capacity * 100, 1) as attendancePercentage
//     FROM classschedule cs
//     JOIN classtype ct ON cs.classTypeId = ct.id
//     LEFT JOIN booking b ON cs.id = b.scheduleId
//     LEFT JOIN memberattendance ma ON b.memberId = ma.memberId
//       AND DATE(ma.checkIn) = DATE(cs.date)
//     WHERE cs.branchId = ?
//       AND cs.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
//       AND cs.date <= CURDATE()
//     GROUP BY cs.id, ct.name, cs.date, cs.capacity
//     ORDER BY cs.date DESC
//     LIMIT 10
//     `,
//     [branchId]
//   );

//   // Format student attendance by class data
//   const formattedAttendanceData = studentAttendanceByClass.map((item) => ({
//     className: item.className,
//     date: item.date.toISOString().split("T")[0],
//     attendance: `${item.attendanceCount}/${item.capacity}`,
//     attendancePercentage: item.attendancePercentage,
//   }));

//   return {
//     summary: {
//       totalStudents,
//       presentStudents,
//       avgAttendance: `${avgAttendance}%`,
//     },
//     studentAttendanceByClass: {
//       title: "Student Attendance by Class",
//       data: formattedAttendanceData,
//     },
//   };
// };

export const getClassPerformanceReportService = async (adminId) => {
  if (!adminId) {
    throw { status: 400, message: "Admin ID is required" };
  }

  try {
    /* ------------------------------------------------
       1️⃣ TOTAL STUDENTS
    ------------------------------------------------ */
    const [totalStudentsResult] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM member
      WHERE adminId = ?
      `,
      [adminId]
    );

    const totalStudents = totalStudentsResult[0]?.count || 0;

    /* ------------------------------------------------
       2️⃣ PRESENT STUDENTS TODAY
    ------------------------------------------------ */
    const [presentStudentsResult] = await pool.query(
      `
      SELECT COUNT(DISTINCT ma.memberId) AS count
      FROM memberattendance ma
      JOIN member m ON ma.memberId = m.id
      WHERE m.adminId = ?
        AND DATE(ma.checkIn) = CURDATE()
      `,
      [adminId]
    );

    const presentStudents = presentStudentsResult[0]?.count || 0;

    /* ------------------------------------------------
       3️⃣ AVERAGE ATTENDANCE %
    ------------------------------------------------ */
    const avgAttendancePercentage =
      totalStudents > 0
        ? Math.round((presentStudents / totalStudents) * 100 * 10) / 10
        : 0;

    /* ------------------------------------------------
       4️⃣ CLASS PERFORMANCE
    ------------------------------------------------ */
    const [studentAttendanceByClass] = await pool.query(
      `
      SELECT
        cs.id AS scheduleId,
        cs.className,
        cs.date,
        cs.capacity,
        cs.trainerId,
        u.fullName AS trainerName,
        r.name AS trainerRole,
        COUNT(DISTINCT b.memberId) AS bookedCount
      FROM classschedule cs
      LEFT JOIN booking b ON cs.id = b.scheduleId
      LEFT JOIN user u ON cs.trainerId = u.id
      LEFT JOIN role r ON u.roleId = r.id
      WHERE cs.adminId = ? OR u.adminId = ?
      GROUP BY
        cs.id,
        cs.className,
        cs.date,
        cs.capacity,
        cs.trainerId,
        u.fullName,
        r.name
      ORDER BY cs.date DESC
      LIMIT 10
      `,
      [adminId, adminId]
    );

    /* ------------------------------------------------
       5️⃣ FORMAT RESPONSE
    ------------------------------------------------ */
    const formattedAttendanceData = studentAttendanceByClass.map((item) => {
      const attendancePercentage =
        item.capacity > 0
          ? Math.round((item.bookedCount / item.capacity) * 100 * 10) / 10
          : 0;

      let formattedDate = "";
      if (item.date) {
        try {
          formattedDate = new Date(item.date).toISOString().split("T")[0];
        } catch (e) {
          formattedDate = String(item.date);
        }
      }

      return {
        className: item.className || "General Class",
        date: formattedDate,
        trainerId: item.trainerId,
        trainerName: item.trainerName || "Trainer",
        trainerRole: item.trainerRole || "Trainer",
        attendance: `${item.bookedCount}/${item.capacity || 0}`,
        attendancePercentage,
      };
    });

    /* ------------------------------------------------
       6️⃣ FINAL RESPONSE
    ------------------------------------------------ */
    return {
      summary: {
        totalStudents,
        presentStudents,
        avgAttendance: `${avgAttendancePercentage}%`,
      },
      studentAttendanceByClass: formattedAttendanceData,
    };
  } catch (error) {
    console.error("Error in getClassPerformanceReportService:", error);
    throw error;
  }
};

const processAttendanceRecord = (record) => {
  return {
    ...record,
    checkIn: record.checkIn
      ? record.checkIn.toISOString().replace("T", " ").substring(0, 19)
      : null,
    checkOut: record.checkOut
      ? record.checkOut.toISOString().replace("T", " ").substring(0, 19)
      : null,
  };
};

// Get a single attendance record by ID
export const getAttendanceByIdService = async (id) => {
  const [attendanceRecords] = await pool.query(
    `
    SELECT 
      ma.id as attendanceId,
      ma.memberId,
      ma.branchId,
      ma.checkIn,
      ma.checkOut,
      ma.status, -- Added
      ma.mode,   -- Added
      ma.notes,  -- Added
      ma.createdAt,
      m.fullName as memberName,
      m.email as memberEmail,
      m.phone as memberPhone,
      m.membershipFrom,
      m.membershipTo,
      b.name as branchName
    FROM memberattendance ma
    JOIN member m ON ma.memberId = m.id
    JOIN Branch b ON ma.branchId = b.id
    WHERE ma.id = ?
    `,
    [id]
  );

  if (attendanceRecords.length === 0) {
    throw { status: 404, message: "Attendance record not found" };
  }

  return processAttendanceRecord(attendanceRecords[0]);
};

// Create a new attendance record (check-in)
export const checkInMemberService = async (data) => {
  // mode is now required from the frontend
  const { memberId, branchId, mode, notes } = data;

  if (!memberId || !branchId || !mode) {
    throw {
      status: 400,
      message: "Member ID, Branch ID, and Mode are required",
    };
  }

  // Check if member exists
  const [memberRecords] = await pool.query(
    "SELECT * FROM member WHERE id = ? AND branchId = ?",
    [memberId, branchId]
  );

  if (memberRecords.length === 0) {
    throw { status: 404, message: "Member not found in this branch" };
  }

  // Check if member already has an active attendance record (not checked out)
  const [existingAttendance] = await pool.query(
    "SELECT * FROM memberattendance WHERE memberId = ? AND branchId = ? AND checkOut IS NULL",
    [memberId, branchId]
  );

  if (existingAttendance.length > 0) {
    throw {
      status: 400,
      message: "Member already has an active attendance record",
      existingRecord: existingAttendance[0],
    };
  }

  // --- Determine Status and Prepare Data ---
  const checkInTime = new Date();
  let status = "Present";
  if (checkInTime.getHours() >= LATE_CHECKIN_HOUR) {
    status = "Late";
  }

  // Create new attendance record with status, mode, and notes
  const [result] = await pool.query(
    "INSERT INTO memberattendance (memberId, branchId, checkIn, status, mode, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
    [memberId, branchId, checkInTime, status, mode, notes || null]
  );

  // Get the created record with member details
  const [newAttendance] = await pool.query(
    `
    SELECT 
      ma.id as attendanceId,
      ma.memberId,
      ma.branchId,
      ma.checkIn,
      ma.checkOut,
      ma.status,
      ma.mode,
      ma.notes,
      ma.createdAt,
      m.fullName as memberName,
      m.email as memberEmail,
      m.phone as memberPhone
    FROM memberattendance ma
    JOIN member m ON ma.memberId = m.id
    WHERE ma.id = ?
    `,
    [result.insertId]
  );

  return processAttendanceRecord(newAttendance[0]);
};

// Update an attendance record (check-out)
export const checkOutMemberService = async (id, data) => {
  // Check if attendance record exists and is not already checked out
  const [attendanceRecords] = await pool.query(
    "SELECT * FROM memberattendance WHERE id = ?",
    [id]
  );

  if (attendanceRecords.length === 0) {
    throw { status: 404, message: "Attendance record not found" };
  }

  const record = attendanceRecords[0];

  if (record.checkOut) {
    throw { status: 400, message: "Member already checked out" };
  }

  // Extract data from the request body
  const { checkOut, notes } = data;

  // Use the provided checkOut time, or default to the current server time
  const checkoutTime = checkOut ? new Date(checkOut) : new Date();

  // Handle optional notes: append the new note to the existing one
  let finalNotes = record.notes || "";
  if (notes) {
    if (finalNotes) {
      finalNotes = `${finalNotes}\n[Checkout Note]: ${notes}`;
    } else {
      finalNotes = `[Checkout Note]: ${notes}`;
    }
  }

  // Update the attendance record with the new check-out time and notes
  // Status and mode are not updated here
  await pool.query(
    "UPDATE memberattendance SET checkOut = ?, notes = ? WHERE id = ?",
    [checkoutTime, finalNotes, id]
  );

  // Get the updated record with member details to return
  const [updatedAttendance] = await pool.query(
    `
    SELECT 
      ma.id as attendanceId,
      ma.memberId,
      ma.branchId,
      ma.checkIn,
      ma.checkOut,
      ma.status,
      ma.mode,
      ma.notes,
      ma.createdAt,
      m.fullName as memberName,
      m.email as memberEmail,
      m.phone as memberPhone
    FROM memberattendance ma
    JOIN member m ON ma.memberId = m.id
    WHERE ma.id = ?
    `,
    [id]
  );

  return processAttendanceRecord(updatedAttendance[0]);
};
// Delete an attendance record
export const deleteAttendanceRecordService = async (id) => {
  // Check if attendance record exists
  const [attendanceRecords] = await pool.query(
    "SELECT * FROM memberattendance WHERE id = ?",
    [id]
  );

  if (attendanceRecords.length === 0) {
    throw { status: 404, message: "Attendance record not found" };
  }

  // Delete the attendance record
  await pool.query("DELETE FROM memberattendance WHERE id = ?", [id]);

  return { message: "Attendance record deleted successfully" };
};

// export const getDashboardDataService = async (branchId) => {
//   if (!branchId) throw { status: 400, message: "Branch ID is required" };

//   try {
//     // Get attendance data for the past 7 days
//     const [attendanceData] = await pool.query(
//       `
//       SELECT
//         DATE(checkIn) as date,
//         COUNT(*) as count
//       FROM memberattendance
//       WHERE branchId = ? AND checkIn >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
//       GROUP BY DATE(checkIn)
//       ORDER BY date ASC
//     `,
//       [branchId]
//     );

//     // Fill in missing days with 0 attendance
//     const weeklyAttendanceTrend = [];
//     const today = new Date();

//     for (let i = 6; i >= 0; i--) {
//       const date = new Date(today);
//       date.setDate(date.getDate() - i);
//       const dateStr = date.toISOString().split("T")[0];

//       const dayData = attendanceData.find((d) => d.date === dateStr);
//       weeklyAttendanceTrend.push({
//         day: date.toLocaleDateString("en-US", { weekday: "short" }),
//         date: dateStr,
//         count: dayData ? dayData.count : 0,
//       });
//     }

//     // Get class distribution by type
//     const [classData] = await pool.query(
//       `
//       SELECT
//         ct.name as className,
//         COUNT(cs.id) as count
//       FROM classschedule cs
//       JOIN classtype ct ON cs.classTypeId = ct.id
//       WHERE cs.branchId = ? AND cs.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
//       GROUP BY ct.name
//     `,
//       [branchId]
//     );

//     const classDistribution = classData.map((cls) => ({
//       name: cls.className,
//       value: cls.count,
//     }));

//     // Get today's classes
//     const [todayClasses] = await pool.query(
//       `
//       SELECT
//         cs.id,
//         cs.startTime,
//         cs.endTime,
//         ct.name as className,
//         u.fullName as trainerName,
//         cs.capacity,
//         COUNT(b.id) as bookedCount
//       FROM classschedule cs
//       JOIN classtype ct ON cs.classTypeId = ct.id
//       JOIN user u ON cs.trainerId = u.id
//       LEFT JOIN booking b ON cs.id = b.scheduleId
//       WHERE cs.branchId = ? AND DATE(cs.date) = CURRENT_DATE
//       GROUP BY cs.id
//       ORDER BY cs.startTime
//     `,
//       [branchId]
//     );

//     // Find the next class
//     const now = new Date();
//     const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
//       .getMinutes()
//       .toString()
//       .padStart(2, "0")}`;

//     let nextClass = null;
//     for (const cls of todayClasses) {
//       if (cls.startTime > currentTime) {
//         nextClass = {
//           name: cls.className,
//           time: cls.startTime,
//         };
//         break;
//       }
//     }

//     const classesToday = {
//       total: todayClasses.length,
//       next: nextClass
//         ? `${nextClass.name} at ${nextClass.time}`
//         : "No more classes today",
//     };

//     // Get active members count
//     const [activeMembers] = await pool.query(
//       `
//       SELECT COUNT(*) as count
//       FROM member
//       WHERE branchId = ? AND status = 'ACTIVE'
//     `,
//       [branchId]
//     );

//     // Get pending feedback count (alerts requiring attention)
//     const [pendingFeedback] = await pool.query(
//       `
//       SELECT COUNT(*) as count
//       FROM alert
//       WHERE branchId = ? AND type = 'FEEDBACK_REQUIRED'
//     `,
//       [branchId]
//     );

//     // Get classes for this week
//     const [weekClasses] = await pool.query(
//       `
//       SELECT
//         COUNT(*) as total,
//         SUM(CASE WHEN DATE(cs.date) < CURRENT_DATE THEN 1 ELSE 0 END) as completed
//       FROM classschedule cs
//       WHERE cs.branchId = ?
//         AND cs.date >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY)
//         AND cs.date < DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY), INTERVAL 7 DAY)
//     `,
//       [branchId]
//     );

//     const classesThisWeek = {
//       total: weekClasses[0].total || 0,
//       completed: weekClasses[0].completed || 0,
//     };

//     // Get detailed daily class schedule for today
//     const [dailySchedule] = await pool.query(
//       `
//       SELECT
//         cs.id,
//         cs.startTime,
//         cs.endTime,
//         ct.name as className,
//         u.fullName as trainerName,
//         cs.capacity,
//         COUNT(b.id) as bookedCount,
//         CASE
//           WHEN cs.endTime < TIME(NOW()) THEN 'Completed'
//           WHEN cs.startTime <= TIME(NOW()) AND cs.endTime >= TIME(NOW()) THEN 'In Progress'
//           ELSE 'Scheduled'
//         END as status
//       FROM classschedule cs
//       JOIN classtype ct ON cs.classTypeId = ct.id
//       JOIN user u ON cs.trainerId = u.id
//       LEFT JOIN booking b ON cs.id = b.scheduleId
//       WHERE cs.branchId = ? AND DATE(cs.date) = CURRENT_DATE
//       GROUP BY cs.id
//       ORDER BY cs.startTime
//     `,
//       [branchId]
//     );

//     // Format the daily schedule
//     const dailyClassSchedule = dailySchedule.map((cls) => ({
//       id: cls.id,
//       time: `${cls.startTime} - ${cls.endTime}` ,
//       className: cls.className,
//       trainer: cls.trainerName,
//       capacity: cls.capacity,
//       booked: cls.bookedCount,
//       status: cls.status,
//     }));

//     // Return a single object with all dashboard data
//     return {
//       weeklyAttendanceTrend,
//       classDistribution,
//       classesToday,
//       membersToTrain: {
//         count: activeMembers[0].count,
//         label: "Active members",
//       },
//       pendingFeedback: {
//         count: pendingFeedback[0].count,
//         label: "Requires attention",
//       },
//       classesThisWeek,
//       dailyClassSchedule, // Added daily class schedule for today only
//     };
//   } catch (error) {
//     console.error("Error fetching dashboard data:", error);
//     throw { status: 500, message: "Failed to fetch dashboard data" };
//   }
// };

export const getDashboardDataService = async (adminId, attendancePeriod = "7days") => {
  if (!adminId) throw { status: 400, message: "adminId is required" };

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // 'YYYY-MM-DD'

  let days = 7;
  if (attendancePeriod === "30days" || attendancePeriod === "Last 30 Days" || attendancePeriod === "30") {
    days = 30;
  } else if (attendancePeriod === "3months" || attendancePeriod === "Last 3 Months" || attendancePeriod === "90") {
    days = 90;
  }

  try {
    /* =========================
       ATTENDANCE TREND (DYNAMIC 7/30/90 DAYS)
       memberattendance → member → adminId
    ========================= */
    const [attendanceData] = await pool.query(
      `
      SELECT 
        DATE(CONVERT_TZ(ma.checkIn, '+00:00', '+05:30')) AS date,
        COUNT(*) AS count
      FROM memberattendance ma
      JOIN member m ON ma.memberId = m.id
      WHERE m.adminId = ?
        AND ma.checkIn >= DATE_SUB(?, INTERVAL ? DAY)
      GROUP BY DATE(CONVERT_TZ(ma.checkIn, '+00:00', '+05:30'))
      ORDER BY date ASC
      `,
      [adminId, todayStr, days]
    );

    const weeklyAttendanceTrend = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const dayData = attendanceData.find((x) => x.date === dateStr);

      const dayLabel = days <= 7
        ? d.toLocaleDateString("en-US", { weekday: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      weeklyAttendanceTrend.push({
        day: dayLabel,
        date: dateStr,
        count: dayData ? dayData.count : 0,
      });
    }

    /* =========================
       CLASS DISTRIBUTION (30 DAYS)
       classschedule → trainer(user) → adminId
    ========================= */
    const [classData] = await pool.query(
      `
      SELECT cs.className, COUNT(cs.id) AS count
      FROM classschedule cs
      JOIN user u ON cs.trainerId = u.id
      WHERE u.adminId = ?
        AND cs.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY cs.className
      `,
      [adminId]
    );

    const classDistribution = classData.map((c) => ({
      name: c.className,
      value: c.count,
    }));

    /* =========================
       TODAY CLASSES
     ========================= */
    const [todayClasses] = await pool.query(
      `
      SELECT 
        cs.id,
        cs.startTime,
        cs.endTime,
        cs.className,
        u.fullName AS trainerName,
        cs.capacity,
        COUNT(b.id) AS bookedCount
      FROM classschedule cs
      JOIN user u ON cs.trainerId = u.id
      LEFT JOIN booking b ON cs.id = b.scheduleId
      WHERE u.adminId = ?
        AND DATE(cs.date) = ?
      GROUP BY cs.id
      ORDER BY cs.startTime
      `,
      [adminId, todayStr]
    );

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    let nextClass = null;
    for (const cls of todayClasses) {
      if (cls.startTime > currentTime) {
        nextClass = { name: cls.className, time: cls.startTime };
        break;
      }
    }

    const classesToday = {
      total: todayClasses.length,
      next: nextClass
        ? `${nextClass.name} at ${nextClass.time}`
        : "No more classes today",
    };

    /* =========================
       ACTIVE MEMBERS
       member → user → adminId
    ========================= */
    const [[activeMembers]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM member m
      JOIN user u ON m.userId = u.id
      WHERE u.adminId = ?
        AND m.status = 'ACTIVE'
      `,
      [adminId]
    );

    /* =========================
       PENDING FEEDBACK (FIXED ✅)
       alert → member → user → adminId
    ========================= */
    const [[pendingFeedback]] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM alert a
      JOIN member m ON a.memberId = m.id
      JOIN user u ON m.userId = u.id
      WHERE u.adminId = ?
        AND a.type = 'FEEDBACK_REQUIRED'
      `,
      [adminId]
    );

    /* =========================
       CLASSES THIS WEEK
    ========================= */
    const [[weekClasses]] = await pool.query(
      `
      SELECT 
        COUNT(*) AS total,
        SUM(
          CASE 
            WHEN DATE(cs.date) < CURRENT_DATE THEN 1 
            ELSE 0 
          END
        ) AS completed
      FROM classschedule cs
      JOIN user u ON cs.trainerId = u.id
      WHERE u.adminId = ?
        AND cs.date >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY)
        AND cs.date < DATE_ADD(
              DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY),
              INTERVAL 7 DAY
            )
      `,
      [adminId]
    );

    /* =========================
       TODAY DAILY SCHEDULE
    ========================= */
    const [dailySchedule] = await pool.query(
      `
      SELECT 
        cs.id,
        cs.startTime,
        cs.endTime,
        cs.className,
        u.fullName AS trainerName,
        cs.capacity,
        COUNT(b.id) AS bookedCount,
        CASE 
          WHEN cs.endTime < TIME(NOW()) THEN 'Completed'
          WHEN cs.startTime <= TIME(NOW()) 
           AND cs.endTime >= TIME(NOW()) THEN 'In Progress'
          ELSE 'Scheduled'
        END AS status
      FROM classschedule cs
      JOIN user u ON cs.trainerId = u.id
      LEFT JOIN booking b ON cs.id = b.scheduleId
      WHERE u.adminId = ?
        AND DATE(cs.date) = ?
      GROUP BY cs.id
      ORDER BY cs.startTime
      `,
      [adminId, todayStr]
    );

    const dailyClassSchedule = dailySchedule.map((cls) => ({
      id: cls.id,
      time: `${cls.startTime} - ${cls.endTime}`,
      className: cls.className,
      trainer: cls.trainerName,
      capacity: cls.capacity,
      booked: cls.bookedCount,
      status: cls.status,
    }));

    /* =========================
       FINAL RESPONSE
    ========================= */
    return {
      weeklyAttendanceTrend,
      classDistribution,
      classesToday,
      membersToTrain: {
        count: activeMembers.count,
        label: "Active members",
      },
      pendingFeedback: {
        count: pendingFeedback.count,
        label: "Requires attention",
      },
      classesThisWeek: {
        total: weekClasses.total || 0,
        completed: weekClasses.completed || 0,
      },
      dailyClassSchedule,
    };
  } catch (error) {
    console.error("Dashboard error:", error);
    throw {
      status: 500,
      message: error.sqlMessage || error.message || "Dashboard error",
    };
  }
};

export const getAllMembersByBranchService = async (branchId) => {
  if (!branchId) throw { status: 400, message: "Branch ID is required" };

  try {
    const [members] = await pool.query(
      `
      SELECT 
        m.id,
        m.fullName,
        m.email,
        m.phone,
        m.gender,
        m.dateOfBirth,
        m.interestedIn,
        m.address,
        m.joinDate,
        m.membershipFrom,
        m.membershipTo,
        m.paymentMode,
        m.amountPaid,
        m.status,
        p.name as planName,
        p.duration as planDuration,
        p.price as planPrice,
        COUNT(DISTINCT ma.id) as attendanceCount,
        COUNT(DISTINCT b.id) as bookingCount
      FROM member m
      LEFT JOIN plan p ON m.planId = p.id
      LEFT JOIN memberattendance ma ON m.id = ma.memberId
      LEFT JOIN booking b ON m.id = b.memberId
      WHERE m.branchId = ?
      GROUP BY m.id
      ORDER BY m.fullName
      `,
      [branchId]
    );

    // Format the date fields for better readability
    const formattedMembers = members.map((member) => ({
      ...member,
      dateOfBirth: member.dateOfBirth
        ? new Date(member.dateOfBirth).toISOString().split("T")[0]
        : null,
      joinDate: member.joinDate
        ? new Date(member.joinDate).toISOString().split("T")[0]
        : null,
      membershipFrom: member.membershipFrom
        ? new Date(member.membershipFrom).toISOString().split("T")[0]
        : null,
      membershipTo: member.membershipTo
        ? new Date(member.membershipTo).toISOString().split("T")[0]
        : null,
    }));

    return formattedMembers;
  } catch (error) {
    console.error("Error fetching members by branch:", error);
    throw { status: 500, message: "Failed to fetch members" };
  }
};
