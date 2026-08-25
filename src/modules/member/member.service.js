import { pool } from "../../config/db.js";
import XLSX from "xlsx";
import { sendTemplatedNotification } from "../messageTemplates/messageTemplate.service.js";
import { createAppNotification } from "../appNotifications/appNotification.service.js";

/**************************************
 * CREATE MEMBER
 **************************************/
import bcrypt from "bcryptjs";

export const createMemberService = async (data) => {
  const {
    fullName,
    email,
    password,
    phone,
    planId,
    planIds, // NEW: Support multiple plans
    membershipFrom,
    dateOfBirth,
    paymentMode,
    amountPaid,
    branchId,
    gender,
    interestedIn,
    address,
    adminId,
    profileImage,
    goal,
    transactionId,
    paymentProofImage,
    paymentStatus,
  } = data;

  if (!fullName) {
    throw {
      status: 400,
      message: "fullName is required",
    };
  }

  // Use provided password or default password fallback (12345 as requested)
  const userPassword = password || "12345";
  const hashedPassword = await bcrypt.hash(userPassword, 10);

  // Handle email: if not provided or empty, auto-generate unique email
  let memberEmail = email ? String(email).trim() : "";
  if (!memberEmail) {
    const cleanName = (fullName || 'member').toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    memberEmail = `${cleanName}${Date.now()}${randomSuffix}@gym.com`;
  } else {
    // Check duplicate email
    const [u1] = await pool.query("SELECT id, fullName FROM user WHERE email = ?", [memberEmail]);
    const [m1] = await pool.query("SELECT id, fullName FROM member WHERE email = ?", [memberEmail]);
    if (u1.length > 0 || m1.length > 0) {
      const existingName = u1[0]?.fullName || m1[0]?.fullName || 'an existing member';
      throw {
        status: 400,
        message: `Email '${memberEmail}' is already registered to ${existingName}. Please enter a different email address.`,
      };
    }
  }

  // Global phone duplicate check
  if (phone) {
    const cleanPhone = String(phone).trim();
    if (cleanPhone) {
      const [phoneExists] = await pool.query(
        "SELECT id, fullName FROM user WHERE phone = ?",
        [cleanPhone]
      );
      if (phoneExists.length > 0) {
        const existingName = phoneExists[0]?.fullName || 'an existing member';
        throw {
          status: 400,
          message: `Phone number '${cleanPhone}' is already registered to ${existingName}. Please enter a different phone number.`,
        };
      }
    }
  }

  // Membership Start Date
  const startDate = membershipFrom ? new Date(membershipFrom) : new Date();
  let endDate = null;

  // Backward compatibility: Handle single planId
  let firstPlanId = planId;

  // Membership End Date (Based on Plan Duration) - for backward compatibility
  if (planId) {
    const [planRows] = await pool.query(
      "SELECT * FROM memberplan WHERE id = ?",
      [planId]
    );
    if (!planRows.length)
      throw { status: 404, message: "Invalid plan selected" };

    const plan = planRows[0];

    endDate = new Date(startDate);
    const days = Number(plan.validityDays ?? plan.duration ?? 0);
    endDate.setDate(endDate.getDate() + days);
  }

  // ---------------------------------------------------
  // 1️⃣ INSERT INTO USER TABLE (only required fields)
  // ---------------------------------------------------
  const [userResult] = await pool.query(
    `INSERT INTO user 
      (adminId,fullName, email, password, phone, roleId, branchId, address, 
       description, duration, gymName, planName, price,dateOfBirth ,profileImage,status)
     VALUES (?,?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL,? ,?,'Active')`,
    [
      adminId,
      fullName,
      memberEmail,
      hashedPassword,
      phone || null,
      4, // roleId = 4 = MEMBER
      branchId || null,
      address || null,
      dateOfBirth ? new Date(dateOfBirth) : null,
      profileImage || null,
    ]
  );

  const userId = userResult.insertId;

  // ---------------------------------------------------
  // 2️⃣ INSERT INTO MEMBER TABLE
  // ---------------------------------------------------
  const [memberRes] = await pool.query(
    `INSERT INTO member
      (userId, fullName, email, password, phone, planId, membershipFrom, membershipTo,
       dateOfBirth, paymentMode, amountPaid, branchId, gender, interestedIn, address, 
       adminId, status, goal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
    [
      userId,
      fullName,
      memberEmail,
      hashedPassword,
      phone || null,
      firstPlanId || null,
      startDate,
      endDate,
      dateOfBirth ? new Date(dateOfBirth) : null,
      paymentMode || null,
      amountPaid ? Number(amountPaid) : 0,
      branchId || null,
      gender || null,
      interestedIn || null,
      address || null,
      adminId || null,
      goal || null,
    ]
  );

  const memberId = memberRes.insertId;

  // ---------------------------------------------------
  // 3️⃣ NEW: INSERT MULTIPLE PLANS INTO member_plan_assignment
  // ---------------------------------------------------

  // Ensure planIds is an array of numbers
  let plansToAssign = [];

  if (planIds && Array.isArray(planIds) && planIds.length > 0) {
    // Already an array, convert to numbers
    plansToAssign = planIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
  } else if (planId) {
    // Fallback to single planId
    plansToAssign = [Number(planId)].filter(id => !isNaN(id) && id > 0);
  }

  console.log('📋 Plans to assign:', plansToAssign);
  console.log('📋 planIds received:', planIds, 'Type:', typeof planIds);
  console.log('📋 planId received:', planId);

  const assignedPlans = [];

  if (plansToAssign.length > 0) {
    const amountPerPlan = amountPaid ? Number(amountPaid) / plansToAssign.length : null;

    for (const planIdNum of plansToAssign) {
      const [planRows] = await pool.query(
        "SELECT id, validityDays, price, name FROM memberplan WHERE id = ?",
        [planIdNum]
      );

      if (planRows.length === 0) {
        console.warn(`⚠️ Plan ${planIdNum} not found in memberplan table, skipping`);
        continue;
      }

      const plan = planRows[0];
      const planStartDate = new Date(startDate);
      const planEndDate = new Date(planStartDate);
      planEndDate.setDate(planEndDate.getDate() + Number(plan.validityDays || 30));

      console.log(`✅ Inserting plan ${planIdNum} (${plan.name}) for member ${memberId}`);

      try {
        const [assignResult] = await pool.query(
          `INSERT INTO member_plan_assignment 
            (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
           VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, NOW())`,
          [
            memberId,
            planIdNum,
            planStartDate,
            planEndDate,
            paymentMode || null,
            amountPerPlan || plan.price,
            adminId || null,
          ]
        );

        assignedPlans.push({
          assignmentId: assignResult.insertId,
          planId: planIdNum,
          planName: plan.name,
          membershipFrom: planStartDate,
          membershipTo: planEndDate,
          price: amountPerPlan || plan.price,
          paymentMode: paymentMode || 'Cash',
        });

        // ✅ Also record this in the payment table for revenue tracking
        const actualAmount = amountPerPlan || plan.price;
        if (Number(actualAmount) > 0) {
          const invoiceNo = "INV-" + Date.now() + "-" + Math.floor(Math.random() * 999);
          await pool.query(
            `INSERT INTO payment (memberId, planId, amount, invoiceNo, paymentDate, collectedByName, paymentMode, transactionId, paymentProofImage, status) 
             VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
            [memberId, planIdNum, actualAmount, invoiceNo, "Admin", paymentMode || 'Cash', transactionId || null, paymentProofImage || null, paymentStatus || 'Approved']
          );
        }

        console.log(`✅ Successfully inserted plan ${planIdNum}, assignment ID: ${assignResult.insertId}`);
      } catch (insertError) {
        console.error(`❌ Error inserting plan ${planIdNum}:`, insertError.message);
        // Continue with other plans even if one fails
      }
    }
  } else {
    console.warn('⚠️ No plans to assign');
  }

  console.log(`✅ Total plans assigned: ${assignedPlans.length} out of ${plansToAssign.length} requested`);

  // Fetch admin details to get gymName
  let gymName = "GymSoft";
  let adminEmail = null;
  let adminPhone = null;
  if (adminId) {
    const [adminRows] = await pool.query(`
      SELECT u.email, u.phone, COALESCE(u.gymName, s.gym_name, 'GymSoft') as gymName 
      FROM user u 
      LEFT JOIN app_settings s ON s.adminId = u.id 
      WHERE u.id = ?`, [adminId]);
    if (adminRows.length > 0) {
      gymName = adminRows[0].gymName || "GymSoft";
      adminEmail = adminRows[0].email;
      adminPhone = adminRows[0].phone;
    }
  }

  // 4️⃣ Strict Notification Requirement: "Welcome to the Gym"
  try {
    await sendTemplatedNotification({
      eventKey: 'MEMBER_CREATED',
      tenantId: Number(adminId || userId),
      receiverId: userId,
      receiverRole: 'Member',
      receiverEmail: memberEmail,
      receiverPhone: phone,
      variables: {
        Name: fullName,
        GymName: gymName,
        Email: memberEmail,
        Password: userPassword
      },
      referenceType: 'MEMBER',
      referenceId: memberId.toString(),
      actionUrl: '/member-dashboard'
    });
    
    // Also notify Admin
    if (adminId && adminEmail) {
      await sendTemplatedNotification({
        eventKey: 'MEMBER_ADDED',
        tenantId: adminId,
        receiverId: adminId,
        receiverRole: 'Admin',
        receiverEmail: adminEmail,
        receiverPhone: adminPhone,
        variables: {
          Name: fullName
        },
        referenceType: 'MEMBER',
        referenceId: memberId.toString(),
        actionUrl: '/members'
      });
    }
  } catch (err) {
    console.error("Failed to insert Welcome notification:", err.message);
  }

  // 5️⃣ Strict Notification Requirement: "Membership Activated"
  if (assignedPlans && assignedPlans.length > 0) {
    const p = assignedPlans[0];
    const startDateFormatted = p.membershipFrom.toISOString().split('T')[0];
    const expiryDateFormatted = p.membershipTo.toISOString().split('T')[0];
    
    // Attempt to calculate duration (in days)
    const durationDays = Math.round((p.membershipTo - p.membershipFrom) / (1000 * 60 * 60 * 24));
    
    try {
      await sendTemplatedNotification({
        eventKey: 'MEMBER_PLAN_ASSIGNED',
        tenantId: Number(adminId || userId),
        receiverId: userId,
        receiverRole: 'Member',
        receiverEmail: memberEmail,
        receiverPhone: phone,
        variables: {
          Name: fullName,
          PlanName: p.planName,
          GymName: gymName,
          Validity: expiryDateFormatted,
          Price: p.price,
          PaymentMode: p.paymentMode,
          DateTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        },
        referenceType: 'MEMBERSHIP',
        referenceId: memberId.toString(),
        actionUrl: '/member-dashboard/my-plan'
      });
    } catch (err) {
      console.error("Failed to insert Membership Activated notification:", err.message);
    }
  }

  return {
    message: "Member created successfully",
    userId,
    memberId,
    fullName,
    email: memberEmail,
    branchId,
    membershipFrom: startDate,
    membershipTo: endDate,
    status: "Active",
    dateOfBirth,
    profileImage,
    assignedPlans, // NEW: Return assigned plans
  };
};

// export const renewMembershipService = async (memberId, body) => {
//   const { planId, paymentMode, amountPaid, adminId } = body;

//   // 1️⃣ Member check
//   const [[member]] = await pool.query("SELECT * FROM member WHERE id = ?", [
//     memberId,
//   ]);

//   if (!member) throw { status: 404, message: "Member not found" };

//   // 2️⃣ Fetch plan
//   const [[plan]] = await pool.query("SELECT * FROM memberplan WHERE id = ?", [
//     planId,
//   ]);

//   if (!plan) throw { status: 404, message: "Invalid Plan" };

//   // 3️⃣ Calculate new membership dates
//   let startDate = member.membershipTo
//     ? new Date(member.membershipTo)
//     : new Date();

//   startDate.setDate(startDate.getDate() + 1); // next day after previous expiry

//   let endDate = new Date(startDate);
//   endDate.setDate(endDate.getDate() + Number(plan.duration));

//   // 4️⃣ Update member table
//   await pool.query(
//     `UPDATE member SET
//         planId = ?,
//         membershipFrom = ?,
//         membershipTo = ?,
//         paymentMode = ?,
//         amountPaid = ?,
//         adminId = ?
//      WHERE id = ?`,
//     [
//       planId,
//       startDate,
//       endDate,
//       paymentMode,
//       amountPaid,
//       adminId || member.adminId,
//       memberId,
//     ]
//   );

//   return {
//     memberId,
//     planId,
//     membershipFrom: startDate,
//     membershipTo: endDate,
//     paymentMode,
//     amountPaid,
//   };
// };
export const renewMembershipService = async (memberId, body) => {
  const { planId, paymentMode, amountPaid, adminId, membershipFrom, transactionId, paymentProofImage } = body;

  // 1️⃣ Member check
  const [[member]] = await pool.query("SELECT * FROM member WHERE id = ?", [
    memberId,
  ]);

  if (!member) throw { status: 404, message: "Member not found" };

  // 2️⃣ Fetch plan
  const [[plan]] = await pool.query("SELECT * FROM memberplan WHERE id = ?", [
    planId,
  ]);

  if (!plan) throw { status: 404, message: "Invalid Plan" };

  // 3️⃣ Calculate new membership dates
  // If admin provided a specific start date, use it. Otherwise auto-calculate.
  let startDate;
  if (membershipFrom) {
    startDate = new Date(membershipFrom);
  } else {
    const today = new Date();
    startDate = member.membershipTo ? new Date(member.membershipTo) : today;
    // If membership has already expired, start from today
    if (startDate < today) {
      startDate = today;
    } else {
      startDate.setDate(startDate.getDate() + 1); // next day after previous expiry
    }
  }

  let endDate = new Date(startDate);

  // 4️⃣ Use validityDays from plan to calculate end date
  const validityDays = plan.validityDays ?? 30; // default to 30 if not defined
  endDate.setDate(endDate.getDate() + validityDays);


  // 5️⃣ Update member table and set status to Active ✅ FIXED (was 'Inactive')
  await pool.query(
    `UPDATE member SET 
        planId = ?, 
        membershipFrom = ?, 
        membershipTo = ?, 
        paymentMode = ?, 
        amountPaid = ?, 
        adminId = ?, 
        status = 'Active'
     WHERE id = ?`,
    [
      planId,
      startDate,
      endDate,
      paymentMode,
      amountPaid,
      adminId || member.adminId,
      memberId,
    ]
  );

  // 6️⃣ Insert into member_plan_assignment so plan appears in history ✅ NEW
  const [existingAssign] = await pool.query(
    "SELECT id FROM member_plan_assignment WHERE memberId = ? AND planId = ? AND DATE(membershipFrom) = DATE(?)",
    [memberId, planId, startDate]
  );

  if (existingAssign.length === 0) {
    await pool.query(
      `INSERT INTO member_plan_assignment 
        (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, NOW())`,
      [
        memberId,
        planId,
        startDate,
        endDate,
        paymentMode || null,
        amountPaid || plan.price,
        adminId || member.adminId || null,
      ]
    );

    // ✅ Also record this in the payment table for revenue tracking
    const actualAmount = amountPaid || plan.price;
    if (Number(actualAmount) > 0) {
      const invoiceNo = "INV-" + Date.now() + "-" + Math.floor(Math.random() * 999);
      const paymentStatus = (paymentMode === "UPI" || paymentMode === "Cash") ? "Pending" : "Completed";
      await pool.query(
        `INSERT INTO payment (memberId, planId, amount, invoiceNo, paymentDate, collectedByName, paymentMode, transactionId, paymentProofImage, status) 
         VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)`,
        [memberId, planId, actualAmount, invoiceNo, "Admin", paymentMode, transactionId || null, paymentProofImage || null, paymentStatus]
      );
    }
  }

  const [[updatedMember]] = await pool.query(
    `SELECT id, status, membershipFrom, membershipTo, planId, paymentMode, amountPaid, adminId, branchId 
     FROM member WHERE id = ?`,
    [memberId]
  );

  return {
    memberId: updatedMember.id,
    planId: updatedMember.planId,
    membershipFrom: updatedMember.membershipFrom,
    membershipTo: updatedMember.membershipTo,
    paymentMode: updatedMember.paymentMode,
    amountPaid: updatedMember.amountPaid,
    status: updatedMember.status,
  };
};
/**************************************
 * LIST MEMBERS
 **************************************/
export const listMembersService = async (
  branchId,
  page = 1,
  limit = 20,
  search = ""
) => {
  const offset = (page - 1) * limit;
  let query = `
    SELECT * FROM member
    WHERE branchId = ?
  `;
  const params = [branchId];

  if (search) {
    query += " AND (fullName LIKE ? OR email LIKE ? OR phone LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += " ORDER BY id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [items] = await pool.query(query, params);

  // Count total
  let countQuery = "SELECT COUNT(*) as total FROM member WHERE branchId = ?";
  const countParams = [branchId];
  if (search) {
    countQuery += " AND (fullName LIKE ? OR email LIKE ? OR phone LIKE ?)";
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [countRows] = await pool.query(countQuery, countParams);
  const total = countRows[0].total;

  return {
    items,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

/**************************************
 * MEMBER DETAIL
 **************************************/
export const memberDetailService = async (id) => {
  const [rows] = await pool.query(
    `
    SELECT
      m.*,
      u.profileImage,

      mp.name AS planName,
      mp.sessions AS totalSessions,
      mp.validityDays,
      mp.trainerType,
      t.fullName AS trainerName
    FROM member m
    JOIN user u ON u.id = m.userId
    LEFT JOIN memberplan mp ON m.planId = mp.id
    LEFT JOIN user t ON m.trainerId = t.id
    WHERE m.id = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    throw { status: 404, message: "Member not found" };
  }

  const member = rows[0];

  // 🔒 Remove sensitive fields
  delete member.password;

  let attended = 0;

  const total = member.planSessions || 0;
  if (member.membershipFrom && member.membershipTo) {
    const [[attendance]] = await pool.query(
      `
      SELECT COUNT(*) AS attended
      FROM memberattendance
      WHERE memberId = ?
        AND checkIn BETWEEN ? AND ?
      `,
      [
        member.userId, // 🔑 matching rule
        member.membershipFrom,
        member.membershipTo,
      ]
    );

    attended = attendance.attended || 0;
  }
  const isCompleted = total > 0 && attended >= total;
  const remaining = isCompleted ? 0 : Math.max(total - attended, 0);
  member.plan = member.planName || "Unknown";
  member.trainerType = member.trainerType || "Not Assigned";
  member.sessionDetails = {
    attended,
    remaining,
    total,
    sessionState: isCompleted ? "No Session" : "Active",
  };

  // ---------------------------------------------------
  // NEW: Fetch all assigned plans from member_plan_assignment
  // ---------------------------------------------------
  const [assignedPlans] = await pool.query(
    `SELECT 
      mpa.id AS assignmentId,
      mpa.planId,
      mpa.membershipFrom,
      mpa.membershipTo,
      mpa.paymentMode,
      mpa.amountPaid,
      mpa.status,
      mpa.assignedAt,
      mp.name AS planName,
      mp.sessions,
      mp.validityDays,
      mp.price,
      mp.type AS planType,
      mp.trainerType,
      DATEDIFF(mpa.membershipTo, CURDATE()) AS remainingDays,
      CASE
        WHEN mpa.membershipTo < CURDATE() THEN 'Expired'
        WHEN mpa.membershipTo >= CURDATE() THEN 'Active'
        ELSE mpa.status
      END AS computedStatus
    FROM member_plan_assignment mpa
    JOIN memberplan mp ON mpa.planId = mp.id
    WHERE mpa.memberId = ?
    ORDER BY mpa.membershipFrom DESC`,
    [id]
  );

  member.assignedPlans = assignedPlans;

  return member;
};

/**************************************
 * UPDATE MEMBER
 **************************************/
// export const updateMemberService = async (id, data) => {
//   // 1️⃣ Fetch existing member
//   const [[existing]] = await pool.query(
//     "SELECT * FROM member WHERE id = ?",
//     [id]
//   );

//   if (!existing) throw { status: 404, message: "Member not found" };

//   // 2️⃣ Extract fields
//   const {
//     fullName = existing.fullName,
//     email = existing.email,
//     phone = existing.phone,
//     password,

//     planId,
//     membershipFrom,
//     dateOfBirth,
//     paymentMode,
//     amountPaid,
//     branchId,
//     gender,
//     interestedIn,
//     address,
//     adminId,
//     status  // <-- NEW
//   } = data;

//   // 3️⃣ Hash password only if updating
//   let hashedPassword = existing.password;
//   if (password) {
//     hashedPassword = await bcrypt.hash(password, 10);
//   }

//   let startDate = membershipFrom ? new Date(membershipFrom) : undefined;
//   let endDate = undefined;

//   // 5️⃣ Recalculate membershipTo if plan changed
//   // let startDate = new Date(membershipFrom);
//   // let endDate = existing.membershipTo;

//   if (planId) {
//     const [planRows] = await pool.query("SELECT * FROM memberplan WHERE id = ?", [planId]);
//     if (!planRows.length) throw { status: 404, message: "Invalid plan selected" };

//     const plan = planRows[0];
//     endDate = new Date(startDate);
//     endDate.setDate(endDate.getDate() + Number(plan.duration || 0));
//   }

//   // 6️⃣ Update member table
//   await pool.query(
//     `UPDATE member SET
//       fullName = ?,
//       email = ?,
//       password = ?,
//       phone = ?,
//       planId = ?,
//       membershipFrom = ?,
//       membershipTo = ?,
//       dateOfBirth = ?,
//       paymentMode = ?,
//       amountPaid = ?,
//       branchId = ?,
//       gender = ?,
//       interestedIn = ?,
//       address = ?,
//       adminId = ?,
//       status=?
//      WHERE id = ?`,
//     [
//       fullName,
//       email,
//       hashedPassword,
//       phone,
//       planId,
//       startDate,
//       endDate,
//       dateOfBirth ? new Date(dateOfBirth) : null,
//       paymentMode,
//       amountPaid,
//       branchId,
//       gender,
//       interestedIn,
//       address,
//       adminId,
//       status,
//       id
//     ]
//   );

//   // 7️⃣ Update user table also (important)
//   await pool.query(
//     `UPDATE user SET
//       fullName = ?,
//       email = ?,
//       phone = ?,
//       password = ?,
//       branchId = ?,
//       address = ?
//      WHERE id = ?`,
//     [
//       fullName,
//       email,
//       phone,
//       hashedPassword,
//       branchId,
//       address,
//       existing.userId
//     ]
//   );

//   return memberDetailService(id);
// };

export const updateMemberService = async (id, data) => {
  /* --------------------------------
     1️⃣ FETCH EXISTING MEMBER
  -------------------------------- */
  const [[existing]] = await pool.query("SELECT * FROM member WHERE id = ?", [
    id,
  ]);

  if (!existing) {
    throw { status: 404, message: "Member not found" };
  }

  /* --------------------------------
     2️⃣ EXTRACT FIELDS (WITH FALLBACKS)
  -------------------------------- */
  const {
    fullName = existing.fullName,
    email = existing.email,
    phone = existing.phone,
    password,
    planId = existing.planId,
    planIds, // NEW: Support multiple plans in edit
    membershipFrom = existing.membershipFrom,
    dateOfBirth = existing.dateOfBirth,
    paymentMode = existing.paymentMode,
    amountPaid = existing.amountPaid,
    branchId = existing.branchId,
    gender = existing.gender,
    interestedIn = existing.interestedIn,
    address = existing.address,
    adminId = existing.adminId,
    status = existing.status,
    profileImage, // ✅ ONLY FOR USER TABLE
    goal = existing.goal,
  } = data;

  /* --------------------------------
     3️⃣ PASSWORD HASH (IF PROVIDED)
  -------------------------------- */
  let hashedPassword = existing.password;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  /* --------------------------------
     3B️⃣ EMAIL DUPLICATE CHECK ON UPDATE
     Only check if email is being changed
  -------------------------------- */
  if (email !== existing.email) {
    const [eu] = await pool.query(
      "SELECT id FROM user WHERE email = ? AND id != ?",
      [email, existing.userId]
    );
    const [em] = await pool.query(
      "SELECT id FROM member WHERE email = ? AND id != ?",
      [email, id]
    );
    if (eu.length > 0 || em.length > 0) {
      throw { status: 400, message: "Email already exists" };
    }
  }

  /* --------------------------------
     4️⃣ MEMBERSHIP DATES
  -------------------------------- */
  // ✅ Use provided membershipFrom or current date for new plans
  const startDate = membershipFrom
    ? new Date(membershipFrom)
    : (existing.membershipFrom ? new Date(existing.membershipFrom) : new Date());

  let endDate = existing.membershipTo;

  /* --------------------------------
     5️⃣ RECALCULATE membershipTo (PLAN BASED)
     ❗ memberplan → ONLY validityDays
  -------------------------------- */
  if (planId && membershipFrom) {
    const [planRows] = await pool.query(
      "SELECT validityDays FROM memberplan WHERE id = ?",
      [planId]
    );

    if (!planRows.length) {
      throw { status: 404, message: "Invalid plan selected" };
    }

    const days = Number(planRows[0].validityDays || 0);

    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
  }

  /* --------------------------------
     6️⃣ UPDATE MEMBER TABLE
     ❌ NO profileImage HERE
  -------------------------------- */
  await pool.query(
    `UPDATE member SET
      fullName = ?,
      email = ?,
      password = ?,
      phone = ?,
      planId = ?,
      membershipFrom = ?,
      membershipTo = ?,
      dateOfBirth = ?,
      paymentMode = ?,
      amountPaid = ?,
      branchId = ?,
      gender = ?,
      interestedIn = ?,
      address = ?,
      adminId = ?,
      status = ?,
      goal = ?
     WHERE id = ?`,
    [
      fullName,
      email,
      hashedPassword,
      phone,
      planId,
      startDate,
      endDate,
      dateOfBirth ? new Date(dateOfBirth) : null,
      paymentMode,
      amountPaid,
      branchId,
      gender,
      interestedIn,
      address,
      adminId,
      status,
      goal,
      id,
    ]
  );

  /* --------------------------------
     7️⃣ UPDATE USER TABLE
     ✅ profileImage ONLY HERE
  -------------------------------- */
  await pool.query(
    `UPDATE user SET
      fullName = ?,
      email = ?,
      phone = ?,
      password = ?,
      branchId = ?,
      address = ?,
      status = ?,
      profileImage = ?
     WHERE id = ?`,
    [
      fullName,
      email,
      phone,
      hashedPassword,
      branchId,
      address,
      status,
      profileImage ?? null,
      existing.userId,
    ]
  );

  /* --------------------------------
     7️⃣ UPDATE MULTIPLE PLANS (if planIds provided)
  -------------------------------- */
  if (planIds && (Array.isArray(planIds) || typeof planIds === 'string')) {
    // Parse planIds if string
    let parsedPlanIds = planIds;
    if (typeof planIds === 'string') {
      try {
        let parsed = planIds.trim();
        if (parsed.startsWith('[') && parsed.endsWith(']')) {
          parsedPlanIds = JSON.parse(parsed);
        } else if (parsed.includes(',')) {
          parsedPlanIds = parsed.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        } else {
          parsedPlanIds = [parseInt(parsed)].filter(id => !isNaN(id));
        }
      } catch (e) {
        console.error('Error parsing planIds in update:', e);
        parsedPlanIds = [];
      }
    }

    if (Array.isArray(parsedPlanIds) && parsedPlanIds.length > 0) {
      const plansToAssign = parsedPlanIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);

      // ✅ Use provided startDate, or today's date (not old membershipFrom)
      const startDateForPlans = startDate || new Date();
      const amountPerPlan = amountPaid ? Number(amountPaid) / plansToAssign.length : null;

      console.log('📅 Start date for new plans:', startDateForPlans);

      for (const planIdNum of plansToAssign) {
        const [planRows] = await pool.query(
          "SELECT id, validityDays, price FROM memberplan WHERE id = ?",
          [planIdNum]
        );

        if (planRows.length === 0) continue;

        const plan = planRows[0];
        const planStartDate = new Date(startDateForPlans);
        const planEndDate = new Date(planStartDate);
        planEndDate.setDate(planEndDate.getDate() + Number(plan.validityDays || 30));

        // Check if assignment already exists
        const [existingAssign] = await pool.query(
          "SELECT id FROM member_plan_assignment WHERE memberId = ? AND planId = ?",
          [id, planIdNum]
        );

        if (existingAssign.length === 0) {
          // Insert new assignment
          await pool.query(
            `INSERT INTO member_plan_assignment 
              (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, NOW())`,
            [
              id,
              planIdNum,
              planStartDate,
              planEndDate,
              paymentMode || null,
              amountPerPlan || plan.price,
              adminId || null,
            ]
          );
        }
      }
    }
  }

  /* --------------------------------
     8️⃣ RETURN UPDATED MEMBER DETAIL
  -------------------------------- */
  return memberDetailService(id);
};

/**************************************
 * DELETE (SOFT DELETE)
 **************************************/
export const deleteMemberService = async (id) => {
  const [rows] = await pool.query("SELECT userId FROM member WHERE id = ?", [id]);

  if (rows.length === 0) {
    throw { status: 404, message: "Member not found" };
  }

  const userId = rows[0].userId;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Delete all related data (order matters for FK constraints)
    const relatedTables = [
      ["DELETE FROM booking WHERE memberId = ?", [id]],
      ["DELETE FROM memberattendance WHERE memberId = ?", [id]],
      ["DELETE FROM payment WHERE memberId = ?", [id]],
      ["DELETE FROM booking_requests WHERE memberId = ?", [id]],
      ["DELETE FROM member_plan_assignment WHERE memberId = ?", [id]],
      ["DELETE FROM notificationlog WHERE memberId = ?", [id]],
      ["DELETE FROM personal_notification WHERE memberId = ?", [id]],
      ["DELETE FROM assessment WHERE memberId = ?", [id]],
      ["DELETE FROM health_metrics WHERE memberId = ?", [id]],
      ["DELETE FROM workout_log WHERE memberId = ?", [id]],
      ["DELETE FROM diet_plan WHERE memberId = ?", [id]],
      ["DELETE FROM attendance WHERE memberId = ?", [id]],
      ["DELETE FROM leaderboard WHERE memberId = ?", [id]],
      ["DELETE FROM dietplanassignment WHERE memberId = ?", [id]],
      ["DELETE FROM workoutplanassignment WHERE memberId = ?", [id]],
      ["DELETE FROM unified_bookings WHERE memberId = ?", [id]],
      ["DELETE FROM healthlog WHERE memberId = ?", [id]],
    ];

    for (const [sql, params] of relatedTables) {
      await conn.query(sql, params).catch(() => {}); // silently skip if table doesn't exist
    }

    // Delete member record
    await conn.query("DELETE FROM member WHERE id = ?", [id]);

    // Delete linked user account (if exists)
    if (userId) {
      await conn.query("DELETE FROM user WHERE id = ?", [userId]).catch(() => {});
    }

    await conn.commit();
    return { message: "Member deleted permanently" };
  } catch (err) {
    await conn.rollback();
    console.error("❌ deleteMemberService error:", err.message);
    throw { status: 500, message: "Failed to delete member: " + err.message };
  } finally {
    conn.release();
  }
};

// member.service.js

export const getMembersByAdminIdService = async (adminId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      m.id,
      m.adminId,
      m.fullName,
      m.email,
      m.phone,
      m.gender,
      m.address,
      m.joinDate,
      m.branchId,
      m.planId,
      m.membershipFrom,
      m.membershipTo,
      m.paymentMode,
      m.interestedIn,
      m.goal,
      m.dateOfBirth,
      m.amountPaid,
      u.profileImage,
      m.trainerId AS trainerId,
      m.trainerType AS trainerType,
      trainerUser.fullName AS trainerName

    FROM member m
    LEFT JOIN user u ON u.id = m.userId
    LEFT JOIN memberplan p ON m.planId = p.id
    LEFT JOIN user trainerUser ON m.trainerId = trainerUser.id
    WHERE m.adminId = ?
    ORDER BY m.id DESC
    `,
    [adminId]
  );

  // Fetch multiple plans for each member
  for (const member of rows) {
    const [plans] = await pool.query(
      `SELECT 
        mpa.id as assignmentId,
        mpa.planId,
        mpa.membershipFrom,
        mpa.membershipTo,
        mpa.status as assignmentStatus,
        mpa.amountPaid,
        mpa.paymentMode,
        mp.name as planName,
        mp.sessions,
        mp.validityDays,
        mp.price,
        mp.type as planType,
        mp.trainerId,
        t.fullName as trainerName,
        DATEDIFF(mpa.membershipTo, CURDATE()) as remainingDays,
        CASE
          WHEN mpa.membershipTo < CURDATE() THEN 'Expired'
          WHEN mpa.membershipTo >= CURDATE() THEN 'Active'
          ELSE 'Inactive'
        END AS computedStatus
      FROM member_plan_assignment mpa
      JOIN memberplan mp ON mpa.planId = mp.id
      LEFT JOIN user t ON mp.trainerId = t.id
      WHERE mpa.memberId = ?
      ORDER BY mpa.membershipFrom DESC`,
      [member.id]
    );

    member.assignedPlans = plans;

    // Calculate member status based on ALL plans
    let hasActivePlan = false;
    if (plans.length > 0) {
      hasActivePlan = plans.some(p => p.computedStatus === 'Active' && p.remainingDays > 0);
    } else if (member.membershipTo) {
      // Fallback for older members without member_plan_assignment entries
      const remainingDays = Math.ceil((new Date(member.membershipTo) - new Date()) / (1000 * 60 * 60 * 24));
      hasActivePlan = remainingDays > 0;
    }

    const newStatus = hasActivePlan ? 'Active' : 'Inactive';
    
    // Auto-update DB if it differs to ensure consistency across other APIs
    if (member.status !== newStatus) {
      pool.query('UPDATE member SET status = ? WHERE id = ?', [newStatus, member.id]).catch(err => console.error("Auto-update member status err:", err));
    }

    member.status = newStatus;

    // Get maximum remaining days from all active plans
    const activePlans = plans.filter(p => p.computedStatus === 'Active');
    member.remainingDays = activePlans.length > 0
      ? Math.max(...activePlans.map(p => p.remainingDays))
      : 0;
  }

  return rows;
};

export const getMembersByTrainerIdService = async (trainerId) => {
  // 1. Find staff & user records for trainerId, including role info
  let realStaffId = trainerId;
  let realUserId = trainerId;
  let adminId = null;
  let roleName = '';

  const [staffRows] = await pool.query(
    `SELECT s.id AS staffId, s.userId, s.adminId, u.roleId, r.name AS roleName
     FROM staff s
     LEFT JOIN user u ON s.userId = u.id
     LEFT JOIN role r ON u.roleId = r.id
     WHERE s.id = ? OR s.userId = ?`,
    [trainerId, trainerId]
  );

  if (staffRows.length) {
    realStaffId = staffRows[0].staffId;
    realUserId = staffRows[0].userId;
    adminId = staffRows[0].adminId;
    roleName = staffRows[0].roleName || '';
  } else {
    // Try user table directly
    const [userRows] = await pool.query(
      `SELECT u.id AS userId, u.adminId, u.roleId, r.name AS roleName, s.id AS staffId
       FROM user u
       LEFT JOIN role r ON u.roleId = r.id
       LEFT JOIN staff s ON u.id = s.userId
       WHERE u.id = ?`,
      [trainerId]
    );
    if (userRows.length) {
      realUserId = userRows[0].userId;
      realStaffId = userRows[0].staffId || trainerId;
      adminId = userRows[0].adminId;
      roleName = userRows[0].roleName || '';
    }
  }

  // 2. Query 1-to-1 directly assigned members first
  const [directRows] = await pool.query(
    `SELECT DISTINCT m.*
     FROM member m
     LEFT JOIN member_plan_assignment mpa ON m.id = mpa.memberId
     LEFT JOIN memberplan p1 ON mpa.planId = p1.id
     LEFT JOIN memberplan p2 ON m.planId = p2.id
     WHERE (p1.trainerId IN (?, ?) OR p2.trainerId IN (?, ?) OR m.trainerId IN (?, ?))
     ORDER BY m.fullName`,
    [realStaffId, realUserId, realStaffId, realUserId, realStaffId, realUserId]
  );

  if (directRows.length > 0) {
    return directRows;
  }

  // 3. Fallback filtering based on Trainer Type (Personal Trainer vs General Trainer)
  const isPersonalTrainer = roleName.toLowerCase().includes('personal') || roleName.toLowerCase().includes('pt');
  const isGeneralTrainer = roleName.toLowerCase().includes('general') || roleName.toLowerCase().includes('gt');

  if (isPersonalTrainer) {
    // Return members enrolled in Personal Training / PT plans
    const [ptMembers] = await pool.query(
      `SELECT DISTINCT m.*
       FROM member m
       LEFT JOIN member_plan_assignment mpa ON m.id = mpa.memberId
       LEFT JOIN memberplan p1 ON mpa.planId = p1.id
       LEFT JOIN memberplan p2 ON m.planId = p2.id
       WHERE (m.adminId = ? OR ? IS NULL)
         AND (
           p1.type = 'PERSONAL' OR p1.trainerType = 'personal' OR p1.name LIKE '%personal%' OR p1.name LIKE '%PT%' OR p1.name = 'Pre'
           OR p2.type = 'PERSONAL' OR p2.trainerType = 'personal' OR p2.name LIKE '%personal%' OR p2.name LIKE '%PT%' OR p2.name = 'Pre'
         )
       ORDER BY m.fullName`,
      [adminId, adminId]
    );
    if (ptMembers.length > 0) {
      return ptMembers;
    }
  } else if (isGeneralTrainer) {
    // Return members enrolled in General Gym Training plans
    const [gtMembers] = await pool.query(
      `SELECT DISTINCT m.*
       FROM member m
       LEFT JOIN member_plan_assignment mpa ON m.id = mpa.memberId
       LEFT JOIN memberplan p1 ON mpa.planId = p1.id
       LEFT JOIN memberplan p2 ON m.planId = p2.id
       WHERE (m.adminId = ? OR ? IS NULL)
         AND (
           (p1.type != 'PERSONAL' AND p1.type IS NOT NULL) OR (p2.type != 'PERSONAL' AND p2.type IS NOT NULL) 
           OR p1.trainerType = 'general' OR p2.trainerType = 'general'
           OR p1.name LIKE '%general%' OR p2.name LIKE '%general%' OR p1.name LIKE '%basic%' OR p2.name LIKE '%basic%'
         )
       ORDER BY m.fullName`,
      [adminId, adminId]
    );
    if (gtMembers.length > 0) {
      return gtMembers;
    }
  }

  // Fallback: If adminId is available, return all members for that admin
  if (adminId) {
    const [allMembers] = await pool.query(
      `SELECT * FROM member WHERE adminId = ? ORDER BY fullName`,
      [adminId]
    );
    return allMembers;
  }

  return directRows;
};

const calculateMembershipDates = (lastMembershipTo, validityDays = 30) => {
  const start = lastMembershipTo ? new Date(lastMembershipTo) : new Date();

  // next day after previous expiry
  start.setDate(start.getDate() + 1);

  const end = new Date(start);
  end.setDate(end.getDate() + validityDays);

  return { start, end };
};

export const getRenewalPreviewService = async (adminId) => {
  if (!adminId) {
    throw { status: 400, message: "adminId is required" };
  }

  /* =====================================================
     1️⃣ FETCH ONLY INACTIVE (RENEWED) MEMBERS
  ===================================================== */
  const [membersRaw] = await pool.query(
    `
    SELECT 
      m.id,
      m.userId,
      m.adminId,
      m.fullName,
      m.email,
      m.phone,
      m.planId,
      m.membershipFrom,
      m.membershipTo,
      m.paymentMode,
      m.amountPaid,
      m.branchId,
      m.status,

      -- plan details (ONLY RENEWED PLAN)
      p.name          AS planName,
      p.validityDays  AS validityDays,
      p.price         AS price,
      p.type          AS planType
    FROM member m
    JOIN memberplan p ON p.id = m.planId
    WHERE m.adminId = ?
      AND m.status = 'Inactive'
    ORDER BY m.membershipTo DESC
    `,
    [adminId]
  );

  if (membersRaw.length === 0) {
    return {
      adminId,
      totalPending: 0,
      members: [],
    };
  }

  /* =====================================================
     2️⃣ DATE NORMALIZATION + RESPONSE SHAPE
  ===================================================== */
  const members = membersRaw.map((m) => {
    const { start, end } = calculateMembershipDates(
      m.membershipTo,
      m.validityDays
    );

    return {
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      phone: m.phone,
      status: m.status, // always Inactive

      plan: {
        planId: m.planId,
        planName: m.planName,
        planType: m.planType, // ✅ ADDED
        price: m.price,
        validityDays: m.validityDays,
      },

      membershipFrom: m.membershipFrom
        ? new Date(m.membershipFrom).toISOString()
        : null,
      membershipTo: m.membershipTo
        ? new Date(m.membershipTo).toISOString()
        : null,

      previewMembershipFrom: start.toISOString(),
      previewMembershipTo: end.toISOString(),

      paymentMode: m.paymentMode,
      amountPaid: m.amountPaid,
      branchId: m.branchId,
    };
  });

  /* =====================================================
     3️⃣ FINAL RESPONSE
  ===================================================== */
  return {
    adminId,
    totalPending: members.length,
    members,
  };
};

export const updateMemberRenewalStatusService = async (
  memberId,
  adminId,
  status
) => {
  // 1️⃣ Check member belongs to admin & is inactive
  const [[member]] = await pool.query(
    `
    SELECT id, userId, fullName, email, phone, status, planId, membershipFrom, membershipTo, paymentMode, amountPaid 
    FROM member
    WHERE id = ?
      AND adminId = ?
      AND status = 'Inactive'
    `,
    [memberId, adminId]
  );

  if (!member) {
    throw {
      status: 404,
      message: "Inactive renewal not found for this admin",
    };
  }

  // 2️⃣ Update status in member table
  await pool.query(
    `
    UPDATE member
    SET status = ?
    WHERE id = ?
    `,
    [status, memberId]
  );

  // 3️⃣ Update status in user table
  await pool.query(
    `
    UPDATE user
    SET status = ?
    WHERE id = ?
    `,
    [status, member.userId]
  );

  // 4️⃣ Insert into member_plan_assignment if approved and assignment doesn't exist
  if (status === "Active" && member.planId) {
    const [existingAssign] = await pool.query(
      `SELECT id FROM member_plan_assignment 
       WHERE memberId = ? AND planId = ? AND membershipFrom = ? AND membershipTo = ?`,
      [member.id, member.planId, member.membershipFrom, member.membershipTo]
    );

    if (existingAssign.length === 0) {
      await pool.query(
        `INSERT INTO member_plan_assignment 
          (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, NOW())`,
        [
          member.id,
          member.planId,
          member.membershipFrom,
          member.membershipTo,
          member.paymentMode || null,
          member.amountPaid || 0,
          adminId,
        ]
      );
      console.log(`✅ Automatically created plan assignment for renewed member ${member.id}`);
    }

    // 5️⃣ Dispatch invoice/payment notification on approval
    // Fetch plan name
    const [[planMeta]] = await pool.query(
      "SELECT name FROM memberplan WHERE id = ?",
      [member.planId]
    );
    const planName = planMeta ? planMeta.name : "Gym Plan";

    const invoiceMsg = `Hi ${member.fullName},\n\nThank you for your payment of Rs.${member.amountPaid || 0} for the ${planName} plan.\n\nYour membership has been successfully renewed. Enjoy your workout! 💪\n\nRegards,\nGym Management`;

    dispatchNotification({
      category: "invoice",
      toEmail: member.email,
      toPhone: member.phone,
      toUserId: member.userId,
      memberId: member.id,
      subject: `Payment Receipt - ${planName} 🧾`,
      message: invoiceMsg,
    }).catch(err => console.error("Error sending renewal invoice notification:", err.message));
  }

  // 6️⃣ Return updated record
  const [[updated]] = await pool.query(
    `
    SELECT 
      id,
      fullName,
      status,
      membershipFrom,
      membershipTo,
      planId
    FROM member
    WHERE id = ?
    `,
    [memberId]
  );

  return updated;
};

export const listPTBookingsService = async (branchId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      pt.id,

      -- MEMBER INFO
      m.fullName AS memberName,

      -- TRAINER INFO (Only personal trainer)
      u.fullName AS trainerName,
      u.roleId AS trainerRole,

      -- PT DETAILS (price removed, type removed)
      pt.date,
      pt.startTime,
      pt.endTime,
      pt.paymentStatus,
      pt.bookingStatus

    FROM pt_bookings pt
    LEFT JOIN member m ON pt.memberId = m.id
    LEFT JOIN user u ON pt.trainerId = u.id

    WHERE pt.branchId = ?
      AND u.roleId = 5   -- Only personal trainer

    ORDER BY pt.id DESC
    `,
    [branchId]
  );

  return rows.map((x) => ({
    ...x,
    time: `${x.startTime} - ${x.endTime}`,
  }));
};

export const getMembersByAdminAndPlan = async (adminId) => {
  try {
    // Fetch members with the given adminId, plan type 'MEMBER' or 'GROUP'
    const query = `
      SELECT m.id, m.fullName, m.email, m.phone, m.planId, m.membershipFrom, m.membershipTo, m.status, mp.type, mp.trainerType
      FROM member m
      JOIN memberplan mp ON m.planId = mp.id
      WHERE m.adminId = ? AND (mp.type = 'MEMBER' OR mp.type = 'GROUP')`;

    const [members] = await pool.query(query, [adminId]);

    // Filter out members whose trainerType is not 'general' if the type is 'MEMBER'
    const filteredMembers = members.filter((member) => {
      // MEMBER plan → only allow GENERAL trainer
      if (member.type === "MEMBER") {
        return member.trainerType === "general";
      }

      // GROUP (or any other type) → allow
      return true;
    });
    return filteredMembers;
  } catch (error) {
    throw { status: 500, message: "Error fetching members", error };
  }
};

export const getMembersByAdminAndGroupPlanService = async (adminId, planId) => {
  try {
    const planQuery = `
      SELECT 
        mp.id,
        mp.name,
        mp.sessions,
        mp.validityDays,
        mp.price,
        mp.type
      FROM 
        memberplan mp
      WHERE 
        mp.id = ?
    `;

    const [planResult] = await pool.query(planQuery, [planId]);

    // If no plan is found with the given ID, throw an error
    if (planResult.length === 0) {
      const error = new Error("Plan not found.");
      error.statusCode = 404; // Not Found
      throw error;
    }
    const plan = planResult[0];
    // Query to get all members for a specific plan ID
    const membersQuery = `
      SELECT 
        m.id,
        m.userId,
        m.fullName,
        m.email,
        m.phone,
        m.gender,
        m.address,
        m.joinDate,
        m.branchId,
        m.membershipFrom,
        m.membershipTo,
        m.paymentMode,
        m.amountPaid,
        m.dateOfBirth,
        m.status,
        m.planId,
        mp.name as planName,
        mp.sessions,
        mp.validityDays,
        mp.price,
        mp.type as planType
      FROM 
        member m
      JOIN 
        memberplan mp ON m.planId = mp.id
      WHERE 
        mp.id = ?         -- CHANGED: Filter by specific planId
        AND m.adminId = ?
      ORDER BY 
        m.fullName
    `;

    // CHANGED: Pass both planId and adminId to the query
    const [members] = await pool.query(membersQuery, [planId, adminId]);

    // Calculate statistics (this logic remains the same)
    const currentDate = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    let completedCount = 0;

    members.forEach((member) => {
      if (member.membershipTo && new Date(member.membershipTo) >= currentDate) {
        activeCount++;
      } else if (
        member.membershipTo &&
        new Date(member.membershipTo) < currentDate
      ) {
        expiredCount++;
        completedCount++;
      }
    });

    const statistics = {
      active: activeCount,
      expired: expiredCount,
      completed: completedCount,
    };

    return {
      members,
      statistics,
      plan,
    };
  } catch (error) {
    throw error;
  }
};

export const getMembersByAdminAndGeneralMemberPlanService = async (
  adminId,
  planId
) => {
  try {
    /* =========================
       FETCH PLAN (VALIDATION)
    ========================= */
    const planQuery = `
      SELECT 
        mp.id,
        mp.name,
        mp.sessions,
        mp.validityDays,
        mp.price,
        mp.type,
        mp.trainerType
      FROM memberplan mp
      WHERE 
        mp.id = ?
        AND mp.type = 'MEMBER'
        AND mp.trainerType = 'general'
    `;

    const [planResult] = await pool.query(planQuery, [planId]);

    if (planResult.length === 0) {
      const error = new Error("General member plan not found.");
      error.statusCode = 404;
      throw error;
    }

    const plan = planResult[0];

    /* =========================
       FETCH MEMBERS
    ========================= */
    const membersQuery = `
      SELECT 
        m.id,
        m.userId,
        m.fullName,
        m.email,
        m.phone,
        m.gender,
        m.address,
        m.joinDate,
        m.branchId,
        m.membershipFrom,
        m.membershipTo,
        m.paymentMode,
        m.amountPaid,
        m.dateOfBirth,
        m.status,
        m.planId,
        mp.name AS planName,
        mp.sessions,
        mp.validityDays,
        mp.price,
        mp.type AS planType,
        mp.trainerType
      FROM member m
      JOIN memberplan mp ON m.planId = mp.id
      WHERE 
        m.adminId = ?
        AND mp.id = ?
        AND mp.type = 'MEMBER'
        AND mp.trainerType = 'general'
      ORDER BY m.fullName
    `;

    const [members] = await pool.query(membersQuery, [adminId, planId]);

    /* =========================
       STATISTICS
    ========================= */
    const currentDate = new Date();
    let active = 0;
    let expired = 0;
    let completed = 0;

    members.forEach((member) => {
      if (member.membershipTo && new Date(member.membershipTo) >= currentDate) {
        active++;
      } else if (
        member.membershipTo &&
        new Date(member.membershipTo) < currentDate
      ) {
        expired++;
        completed++;
      }
    });

    return {
      plan,
      members,
      statistics: {
        active,
        expired,
        completed,
      },
    };
  } catch (error) {
    throw error;
  }
};

/**************************************
 * EXCEL MEMBER IMPORT
 **************************************/
export const importMembersService = async (adminId, branchId, fileBuffer) => {
  const parsedAdminId = parseInt(adminId);
  const parsedBranchId = branchId ? parseInt(branchId) : null;

  if (!parsedAdminId) {
    throw { status: 400, message: "adminId is required" };
  }

  // Read the workbook from buffer
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (!rows || rows.length === 0) {
    throw { status: 400, message: "Excel sheet is empty or invalid" };
  }

  // Row limit of 500 rows to prevent server timeout
  if (rows.length > 500) {
    throw { status: 400, message: "Max 500 rows allowed per import" };
  }

  let successCount = 0;
  const skippedList = [];

  // Get all existing member plans for this admin so we can map Plan Name to planId
  const [dbPlans] = await pool.query(
    "SELECT id, name, validityDays, price FROM memberplan WHERE adminId = ?",
    [parsedAdminId]
  );

  // Create a helper map: lowercased plan name -> plan object
  const planMap = new Map();
  dbPlans.forEach(plan => {
    planMap.set(plan.name.trim().toLowerCase(), plan);
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Normalize headers (case-insensitive and trim spaces)
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      normalizedRow[key.trim().toLowerCase()] = row[key];
    });

    const fullName = normalizedRow["full name"] || normalizedRow["name"];
    const phone = normalizedRow["phone"] || normalizedRow["phone number"] || normalizedRow["mobile"];
    const email = normalizedRow["email"] || normalizedRow["email address"];
    const gender = normalizedRow["gender"];
    const address = normalizedRow["address"];
    const planName = normalizedRow["plan name"] || normalizedRow["plan"];
    const goal = normalizedRow["goal"];
    const dob = normalizedRow["date of birth"] || normalizedRow["dob"] || normalizedRow["birthdate"];

    // Validate mandatory fields
    if (!fullName || !phone) {
      skippedList.push({
        name: fullName || `Row ${i + 2}`,
        phone: phone || "N/A",
        reason: "Missing Name or Phone Number"
      });
      continue;
    }

    const phoneStr = String(phone).trim();
    const cleanName = String(fullName).trim();

    // Handle email - auto generate if missing
    let cleanEmail = email ? String(email).trim().toLowerCase() : `${phoneStr}@temp.gym.com`;

    try {
      // Check if email or phone already exists in user or member tables
      const [existingUser] = await pool.query(
        "SELECT id FROM user WHERE email = ? OR phone = ?",
        [cleanEmail, phoneStr]
      );

      const [existingMember] = await pool.query(
        "SELECT id FROM member WHERE email = ? OR phone = ?",
        [cleanEmail, phoneStr]
      );

      if (existingUser.length > 0 || existingMember.length > 0) {
        skippedList.push({
          name: cleanName,
          phone: phoneStr,
          reason: "Email or Phone already exists in the system"
        });
        continue;
      }

      // Password hashing: use phone number as default password
      const hashedPassword = await bcrypt.hash(phoneStr, 10);

      // Parse dates
      const dobDate = dob ? new Date(dob) : null;
      const startDate = new Date();
      let endDate = null;
      let matchedPlanId = null;
      let matchedPlan = null;

      // Plan matching
      if (planName) {
        const cleanPlanName = String(planName).trim().toLowerCase();
        matchedPlan = planMap.get(cleanPlanName);
        if (matchedPlan) {
          matchedPlanId = matchedPlan.id;
          endDate = new Date(startDate);
          const days = Number(matchedPlan.validityDays || 30);
          endDate.setDate(endDate.getDate() + days);
        }
      }

      // 1. Insert into User table
      const [userResult] = await pool.query(
        `INSERT INTO user 
          (adminId, fullName, email, password, phone, roleId, branchId, address, dateOfBirth, status)
         VALUES (?, ?, ?, ?, ?, 4, ?, ?, ?, 'Active')`,
        [
          parsedAdminId,
          cleanName,
          cleanEmail,
          hashedPassword,
          phoneStr,
          parsedBranchId,
          address ? String(address).trim() : null,
          dobDate,
        ]
      );

      const userId = userResult.insertId;

      // 2. Insert into Member table
      const [memberRes] = await pool.query(
        `INSERT INTO member
          (userId, fullName, email, password, phone, planId, membershipFrom, membershipTo,
           dateOfBirth, branchId, gender, address, adminId, status, goal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
        [
          userId,
          cleanName,
          cleanEmail,
          hashedPassword,
          phoneStr,
          matchedPlanId,
          startDate,
          endDate,
          dobDate,
          parsedBranchId,
          gender ? String(gender).trim() : null,
          address ? String(address).trim() : null,
          parsedAdminId,
          goal ? String(goal).trim() : null
        ]
      );

      const memberId = memberRes.insertId;

      // 3. Insert into member_plan_assignment if plan matched
      if (matchedPlanId && matchedPlan) {
        await pool.query(
          `INSERT INTO member_plan_assignment 
            (memberId, planId, membershipFrom, membershipTo, paymentMode, amountPaid, status, assignedBy, assignedAt)
           VALUES (?, ?, ?, ?, 'Excel Import', ?, 'Active', ?, NOW())`,
          [
            memberId,
            matchedPlanId,
            startDate,
            endDate,
            matchedPlan.price || 0,
            parsedAdminId
          ]
        );
      }

      successCount++;
    } catch (rowErr) {
      console.error(`Error importing row ${i + 2}:`, rowErr);
      skippedList.push({
        name: cleanName,
        phone: phoneStr,
        reason: rowErr.message || "Database Insert Error"
      });
    }
  }

  return {
    successCount,
    skippedCount: skippedList.length,
    skippedList
  };
};

export const assignTrainerToMemberService = async ({ memberId, trainerId, trainerType }) => {
  const actualTrainerType = trainerType || "personal";
  const [result] = await pool.query(
    "UPDATE member SET trainerId = ?, trainerType = ? WHERE id = ?",
    [trainerId, actualTrainerType, memberId]
  );
  
  if (result.affectedRows === 0) {
    throw { status: 404, message: "Member not found" };
  }
  
  try {
    const [[member]] = await pool.query("SELECT * FROM member WHERE id = ?", [memberId]);
    if (member) {
      const [[admin]] = await pool.query("SELECT id, gymName, email, phone FROM user WHERE id = ?", [member.adminId]);
      const gymName = admin?.gymName || "Our Gym";

      let trainerUser = null;
      const [[trainerAsUser]] = await pool.query("SELECT id, fullName, email, phone FROM user WHERE id = ?", [trainerId]);
      if (trainerAsUser) {
        trainerUser = trainerAsUser;
      } else {
        const [[staff]] = await pool.query("SELECT userId FROM staff WHERE id = ?", [trainerId]);
        if (staff) {
          const [[staffUser]] = await pool.query("SELECT id, fullName, email, phone FROM user WHERE id = ?", [staff.userId]);
          trainerUser = staffUser;
        }
      }

      if (trainerUser) {
        await sendTemplatedNotification({
          eventKey: 'TRAINER_ASSIGNED',
          tenantId: member.adminId,
          receiverId: trainerUser.id,
          receiverRole: 'Trainer',
          receiverEmail: trainerUser.email,
          receiverPhone: trainerUser.phone,
          variables: {
            TrainerName: trainerUser.fullName,
            MemberName: member.fullName,
            GymName: gymName
          },
          referenceType: 'MEMBER',
          referenceId: memberId.toString(),
          actionUrl: '/members'
        }).catch(err => console.error("Error sending TRAINER_ASSIGNED notification:", err.message));

        if (member.userId) {
          await sendTemplatedNotification({
            eventKey: 'MEMBER_ASSIGNED_TO_TRAINER',
            tenantId: member.adminId,
            receiverId: member.userId,
            receiverRole: 'Member',
            receiverEmail: member.email,
            receiverPhone: member.phone,
            variables: {
              MemberName: member.fullName,
              TrainerName: trainerUser.fullName,
              GymName: gymName
            },
            referenceType: 'TRAINER',
            referenceId: trainerId.toString(),
            actionUrl: '/member-dashboard'
          }).catch(err => console.error("Error sending MEMBER_ASSIGNED_TO_TRAINER notification:", err.message));
        }

        if (admin && admin.id) {
          await sendTemplatedNotification({
            eventKey: 'ADMIN_TRAINER_ASSIGNED',
            tenantId: member.adminId,
            receiverId: admin.id,
            receiverRole: 'Admin',
            receiverEmail: admin.email,
            receiverPhone: admin.phone,
            variables: {
              TrainerName: trainerUser.fullName,
              MemberName: member.fullName,
              GymName: gymName
            },
            referenceType: 'TRAINER_ASSIGNMENT',
            referenceId: memberId.toString(),
            actionUrl: '/members'
          }).catch(err => console.error("Error sending ADMIN_TRAINER_ASSIGNED notification:", err.message));
        }
      }
    }
  } catch (err) {
    console.error("Error processing notifications in assignTrainerToMemberService:", err.message);
  }

  return { memberId, trainerId, trainerType };
};
