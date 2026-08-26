import { pool } from "../../config/db.js";  // ✅ named import

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";
import { notifySuperAdmin } from "../notifications/notif.service.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";
import { dispatchNotification } from "../../utils/notificationDispatcher.js";
import crypto from "crypto";
import { sendTemplatedNotification } from "../messageTemplates/messageTemplate.service.js";

/**************************************
 * REGISTER USER (CREATE)
 **************************************/
export const registerUser = async (data,payload) => {
 
  const fullName = data.fullName?.trim();
  const email = data.email?.trim();
  const password = data.password;
  const phone = data.phone?.trim() || null;
  const roleId = data.roleId;
  const branchId = data.branchId || null;
  const gstNumber = data.gstNumber || null;
  const tax = data.tax || '18';
  const gymAddress = data.gymAddress || null;

  // ✅ Subscription & License fields
  const subscriptionPlan = data.subscriptionPlan || 'Basic';
  const licenseExpiryDate = data.licenseExpiryDate || null;

  const gymName = data.gymName || null;
  const address = data.address || null;
  const planName = data.planName || null;
  const price = data.price || null;
  const duration = data.duration || null;
  const description = data.description || null;
  const status = data.status || null;

  // ✅ Jis admin ne ye user create kiya hai
  const adminId = data.adminId || null;

  if (!fullName || !email || !password || !roleId) {
    throw { status: 400, message: "fullName, email, password, roleId required" };
  }

  // Check email
  const [ex] = await pool.query(
    "SELECT id FROM user WHERE email = ?",
    [email]
  );
  if (ex.length > 0) throw { status: 400, message: "Email already exists" };

  const hash = await bcrypt.hash(password, 10);

  

  // const sql = `
  //   INSERT INTO user (
  //     fullName, email, password, phone, roleId, branchId, 
  //     gymName, address, planName, price, duration, description, status, adminId,profileImage
  //   ) 
  //   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  // `;

  // Get Automation Settings to configure Trial (Only for Admin/Superadmin)
  let trialStartDate = null;
  let trialEndDate = null;
  let gracePeriodEndDate = null;
  let trialStatus = 'None';
  let welcomeTemplate = null;

  // Assuming roleId = 2 means Admin (Gym Owner)
  // ONLY apply trial if subscriptionPlan is 'Trial' or '7-Day Trial'
  const isTrialSelected = subscriptionPlan === 'Trial' || subscriptionPlan === '7-Day Trial' || data.isTrial === true || data.isTrial === 'true' || data.isTrial === 1;

  if ((roleId === 2 || roleId === '2') && isTrialSelected) {
    const [settings] = await pool.query('SELECT * FROM automation_settings LIMIT 1');
    if (settings.length > 0) {
      const trialDays = settings[0].trialDurationDays || 7;
      const graceDays = settings[0].gracePeriodDays || 3;
      
      trialStartDate = new Date();
      trialEndDate = new Date(trialStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);
      
      gracePeriodEndDate = new Date(trialEndDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + graceDays);

      trialStatus = 'Active';
    }

    const [templates] = await pool.query("SELECT * FROM message_templates WHERE eventKey = 'WELCOME_TRIAL'");
    welcomeTemplate = templates.length > 0 ? templates[0] : null;
  }

  const sql = `
    INSERT INTO user (
      fullName, email, password, phone, roleId, branchId, 
      gymName, address, planName, price, duration, description, status, adminId, profileImage, gstNumber, tax, gymAddress,
      subscriptionPlan, licenseExpiryDate,
      trialStartDate, trialEndDate, trialStatus, gracePeriodEndDate, isTrial
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(sql, [
    fullName,
    email,
    hash,
    phone,
    roleId,
    branchId,
    gymName,
    address,
    planName,
    price,
    duration,
    description,
    status,
    adminId,
    payload.profileImage || null,
    gstNumber,
    tax,
    gymAddress,
    subscriptionPlan,
    licenseExpiryDate,
    trialStartDate,
    trialEndDate,
    trialStatus,
    gracePeriodEndDate,
    isTrialSelected ? 1 : 0
  ]);

  // ✅ Send real Welcome Email + WhatsApp when Admin registers (Trial or otherwise)
  if (trialStatus === 'Active' && welcomeTemplate) {
    let msgBody = (welcomeTemplate.message || "")
      .replace('{Name}', fullName)
      .replace('{Days}', Math.round((trialEndDate - trialStartDate) / (1000 * 60 * 60 * 24)));

    dispatchNotification({
      category: "saas_renewal_channel",
      toEmail: email,
      toPhone: phone || null,
      toUserId: result.insertId,
      subject: welcomeTemplate.subject || "Welcome to GymSoft!",
      message: msgBody,
      isSystemEvent: true,
      customChannels: ["EMAIL", "IN_APP"]
    }).catch(err => console.error("❌ Error sending admin trial welcome notification:", err.message));
  } else if (roleId == 2 || roleId == '2') {
    // Admin registered without trial – still send a welcome email with credentials and plan details
    const credMsg = `Hi ${fullName},\n\nYour gym admin account has been created successfully.\n\nLogin Details:\nEmail: ${email}\nPassword: ${data.password}\n\nGym: ${gymName || 'N/A'}\n\nPlan Details:\nPlan Name: ${planName || 'N/A'}\nPrice: ₹${price || 0}\nDuration: ${duration || 'N/A'}\n\nRegards,\nGymSoft Team`;
    dispatchNotification({
      category: "saas_renewal_channel",
      toEmail: email,
      toPhone: phone || null,
      toUserId: result.insertId,
      subject: "Your Gym Admin Account — GymSoft",
      message: credMsg,
      isSystemEvent: true,
      customChannels: ["EMAIL", "IN_APP"]
    }).catch(err => console.error("❌ Error sending admin welcome email:", err.message));
  }

  // ✅ Send IN-APP Welcome Notification to Dashboard
  if (roleId == 2 || roleId == '2') {
    try {
      const inAppMsg = `Hi ${fullName}, welcome aboard! We are excited to have ${gymName || 'your gym'} with us. You have successfully subscribed to the ${planName || 'N/A'} plan (₹${price || 0} for ${duration || 'N/A'}). Let's get started!`;
      await pool.query(
        "INSERT INTO app_notification (tenantId, senderId, receiverId, receiverRole, type, title, message, referenceType, referenceId, isRead, createdAt) VALUES (?, NULL, ?, 'Admin', 'SYSTEM_ALERT', 'Welcome to GymSoft!', ?, 'SYSTEM', '1', FALSE, NOW())",
        [result.insertId, result.insertId, inAppMsg]
      );
    } catch (e) {
      console.error("❌ Failed to insert in-app welcome notification:", e.message);
    }
  }
  // Return full user object
  const newUser = {
    id: result.insertId,
    fullName,
    email,
    phone,
    roleId,
    branchId,
    gymName,
    address,
    planName,
    price,
    duration,
    description,
    status,
    adminId,
    profileImage: payload.profileImage || null,
    gstNumber,
    tax,
    gymAddress,
    subscriptionPlan,
    licenseExpiryDate
  };

  if (roleId === 2 || roleId === '2') {
    notifySuperAdmin(`New Admin created: ${fullName} (${email}) for Gym: ${gymName || 'N/A'}`, 'IN-APP');
    
    // Log purchase record for SuperAdmin payments tab
    try {
      const paymentMethod = data.paymentMethod || 'Cash';
      const paymentDetails = data.razorpay_payment_id || data.transactionId || null;
      const [purchaseRes] = await pool.query(
        `INSERT INTO purchase (selectedPlan, companyName, email, billingDuration, startDate, amount, phone, adminName, branchName, gstNumber, city, paymentMethod, paymentDetails, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')`,
        [planName, gymName, email, duration || 'Not Specified', new Date(), price || 0, phone || "", fullName || "", "Head Branch", gstNumber || null, null, paymentMethod, paymentDetails]
      );
      const purchaseId = purchaseRes.insertId;
      const transactionId = paymentDetails || `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(purchaseId).padStart(4, '0')}`;
      await pool.query(`UPDATE purchase SET transactionId = ? WHERE id = ?`, [transactionId, purchaseId]);
    } catch (purchaseErr) {
      console.error("❌ Failed to log purchase for admin creation:", purchaseErr.message);
    }

    // ✅ Notify SuperAdmin via EMAIL with Plan details
    try {
      const [saResult] = await pool.query("SELECT id, email FROM user WHERE roleId = 1 LIMIT 1");
      if (saResult.length > 0) {
        const saEmail = saResult[0].email;
        const saId = saResult[0].id;
        const saMsg = `Hello Super Admin,\n\nA new admin has registered and taken a plan.\n\nAdmin Details:\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nGym Name: ${gymName || 'N/A'}\n\nPlan Details:\nPlan Name: ${planName || 'N/A'}\nPrice: ₹${price || 0}\nDuration: ${duration || 'N/A'}\n\nPlease check the dashboard for more details.\n\nRegards,\nGymSoft Team`;
        
        await dispatchNotification({
          category: "saas_renewal_channel",
          toEmail: saEmail,
          toUserId: saId,
          subject: "New Admin Registration & Plan Details",
          message: saMsg,
          isSystemEvent: true,
          customChannels: ["EMAIL", "IN_APP"]
        });
      }
    } catch (e) {
      console.error("❌ Failed to send superadmin plan email", e.message);
    }
  }

  return newUser;
};



/**************************************
 * LOGIN USER
 **************************************/
// export const loginUser = async ({ email, password }) => {
//   const sql = `
//     SELECT u.*, r.roleId AS roleName, b.name AS branchName
//     FROM user u
//     LEFT JOIN role r ON r.id = u.roleId
//     LEFT JOIN branch b ON b.id = u.branchId
//     WHERE u.email = ?
//   `;

//   const [rows] = await pool.query(sql, [email]);
//   const user = rows[0];
//   if (!user) throw { status: 400, message: "User not found" };

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) throw { status: 401, message: "Invalid password" };

//   const token = jwt.sign(
//     {
//       id: user.id,
//       role: user.roleId,
//       branchId: user.branchId,
//     },
//     ENV.jwtSecret,
//     { expiresIn: "7d" }
//   );

//   return {
//     token,
//     user: {
//       id: user.id,
//       fullName: user.fullName,
//       email: user.email,
//       phone: user.phone,
//       role: user.roleId,
//       branchId: user.branchId,
//       branchName: user.branchName,
//     }
//   };
// };


// ✅ service
export const loginUser = async ({ email, password, bypassPassword = false }) => {
  /* ===============================
     1️⃣ GET USER + ROLE + BRANCH
  =============================== */
  const sql = `
    SELECT 
      u.id,
      u.fullName,
      u.email,
      u.phone,
      u.password,
      u.roleId,
      u.branchId,
      u.adminId,
      u.profileImage,
      u.permissions,
      u.status,
      u.trialStatus,
      u.isTrial,
      u.licenseExpiryDate,
      u.razorpayKeyId,
      r.name AS roleName,
      b.name AS branchName
    FROM user u
    LEFT JOIN role r ON r.id = u.roleId
    LEFT JOIN branch b ON b.id = u.branchId
    WHERE u.email = ?
    ORDER BY u.id DESC
  `;

  const [rows] = await pool.query(sql, [email]);
  
  if (rows.length === 0) {
    throw { status: 400, message: "User not found" };
  }

  let user = null;
  let isPlanExpired = false;
  let isAccountInactive = false;

  // Since emails can be duplicated across tenants, we must find the first one that matches the password.
  // We order by id DESC to prefer the most recently created account if passwords collide.
  for (const row of rows) {
    const match = bypassPassword || await bcrypt.compare(password, row.password);
    if (match) {
      const normStatus = (row.status || '').toLowerCase().trim();
      
      // 1) Block "Inactive" users completely
      if (normStatus === 'inactive') {
        if (!user) {
          user = row;
          user.isAccountInactive = true;
        }
        continue;
      }

      // 2) Check if plan is expired
      let adminPlanExpired = false;
      if (row.trialStatus === 'Expired') {
        adminPlanExpired = true;
      } else if ((row.roleId == 2 || (row.roleName && row.roleName.toUpperCase() === 'ADMIN')) && row.licenseExpiryDate) {
        if (new Date(row.licenseExpiryDate) < new Date()) {
          adminPlanExpired = true;
        }
      }

      if (adminPlanExpired) {
        if (!user || user.isAccountInactive) {
          user = row;
          user.isAccountInactive = false;
          isPlanExpired = true;
        }
        continue; 
      }
      
      // Found a matching, active account with active plan
      user = row;
      user.isAccountInactive = false;
      isPlanExpired = false;
      break;
    }
  }

  if (user && user.isAccountInactive) {
    throw { status: 403, message: "Your account has been deactivated. Please contact support." };
  }

  if (!user) {
    throw { status: 401, message: "Invalid password or account" };
  }

  /* ===============================
     3️⃣ STAFF CHECK (OPTIONAL)
  =============================== */
  const [staffRows] = await pool.query(
    `SELECT id FROM staff WHERE userId = ? LIMIT 1`,
    [user.id]
  );

  const staffId = staffRows.length ? staffRows[0].id : null;

  /* ===============================
     4️⃣ MEMBER CHECK (ONLY FOR ROLE = MEMBER)
  =============================== */
  let memberId = null;

  if (user.roleName && user.roleName.toUpperCase().includes('MEMBER')) { // MEMBER
    const [memberRows] = await pool.query(
      `SELECT id, status FROM member WHERE userId = ? LIMIT 1`,
      [user.id]
    );

    if (!memberRows.length) {
      throw {
        status: 403,
        message: "Member record not found",
      };
    }

    const member = memberRows[0];
    memberId = member.id;

    // ✅ Check if member has at least ONE active plan with valid dates
    const [activePlans] = await pool.query(
      `SELECT id, membershipTo 
       FROM member_plan_assignment 
       WHERE memberId = ? 
         AND status = 'Active' 
         AND membershipTo >= CURDATE()
       LIMIT 1`,
      [memberId]
    );

    // ❌ No active plan assignment found - check fallback in member table
    if (activePlans.length === 0) {
      const [memDirect] = await pool.query(
        `SELECT id FROM member WHERE id = ? AND (status = 'Active' OR status = 'ACTIVE' OR membershipTo >= CURDATE() OR membershipTo IS NULL) LIMIT 1`,
        [memberId]
      );

      if (memDirect.length === 0) {
        // Update member status to Inactive
        await pool.query(
          `UPDATE member SET status = 'Inactive' WHERE id = ?`,
          [member.id]
        );

        isPlanExpired = true;
      }
    }
  }

  /* ===============================
     5️⃣ JWT TOKEN
  =============================== */
  const token = jwt.sign(
    {
      id: user.id,          // userId (auth)
      role: user.roleName,  // "Superadmin", "Admin", etc.
      roleId: user.roleId,
      branchId: user.branchId,
      adminId: user.adminId,
      staffId: staffId,
      memberId: memberId,   // ✅ DOMAIN ID
      isPlanExpired: isPlanExpired
    },
    ENV.jwtSecret,
    { expiresIn: "7d" }
  );

  /* ===============================
     6️⃣ FINAL RESPONSE
  =============================== */
  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      isPlanExpired: isPlanExpired,
      email: user.email,
      phone: user.phone,

      roleId: user.roleId,
      roleName: user.roleName,

      branchId: user.branchId,
      branchName: user.branchName,

      adminId: user.adminId,
      staffId: staffId,
      memberId: memberId,   // ✅ NOW GUARANTEED

      razorpayKeyId: user.razorpayKeyId || null,

      profileImage: user.profileImage || null,
      isTrial: user.isTrial || 0,
      trialStatus: user.trialStatus || "None",
      licenseExpiryDate: user.licenseExpiryDate || null,
      permissions: (() => {
        if (!user.permissions) return [];
        try {
          let parsed = JSON.parse(user.permissions);
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      })(),
    },
  };
};



/**************************************
 * GET USER BY ID
 **************************************/
export const fetchUserById = async (id) => {
  const sql = `
    SELECT u.*, r.name AS roleName, b.name AS branchName
    FROM user u
    LEFT JOIN role r ON r.id = u.roleId
    LEFT JOIN branch b ON b.id = u.branchId
    WHERE u.id = ?
  `;
  const [rows] = await pool.query(sql, [id]);

  if (rows.length === 0) throw { status: 404, message: "User not found" };

  return rows[0];
};


/**************************************
 * UPDATE USER
 **************************************/
// export const modifyUser = async (id, data,files) => {
//     const [rows] = await pool.query("SELECT * FROM user WHERE id = ?", [id]); // <-- added
//   const existingUser = rows[0]; // <-- added
//   if (data.password) {
//     data.password = await bcrypt.hash(data.password, 10);
//   }
// let profileImageUrl = existingUser.profileImage; // Default to existing profile image

//   if (files?.profileImage) {
//     // If a new image is provided in the request files, upload it to Cloudinary
//     profileImageUrl = await uploadToCloudinary(files.profileImage, "users/profile");
//   }
//   const sql = `
//     UPDATE user SET 
//       fullName=?, email=?, phone=?, roleId=?, branchId=?, 
//       gymName=?, address=?, planName=?, price=?, duration=?, 
//       description=?, status=?, password=IFNULL(?, password), profileImage=?
//     WHERE id=?
//   `;

//   await pool.query(sql, [
//     data.fullName,
//     data.email,
//     data.phone,
//     existingUser.roleId,
//     data.branchId,
//     data.gymName,
//     data.address,
//     data.planName,
//     data.price,
//     data.duration,
//     data.description,
//     data.status,
//     data.password || null,
//     profileImageUrl,
//     id
//   ]);

//   return fetchUserById(id);
// };
export const modifyUser = async (id, data = {}, files) => { // Default to empty object if data is undefined
  const [rows] = await pool.query("SELECT * FROM user WHERE id = ?", [id]); // Get existing user
  const existingUser = rows[0]; // Store the existing user

  // Prepare the fields to be updated
  const updatedFields = [];
  
  // Initialize the updated data with existing data (so fields not passed remain unchanged)
  const updatedData = {
    fullName: existingUser.fullName,
    email: existingUser.email,
    phone: existingUser.phone,
    branchId: existingUser.branchId,
    gymName: existingUser.gymName,
    address: existingUser.address,
    planName: existingUser.planName,
    price: existingUser.price,
    duration: existingUser.duration,
    description: existingUser.description,
    status: existingUser.status,
    password: existingUser.password, // Retain current password if not provided
    profileImage: existingUser.profileImage,
    gstNumber: existingUser.gstNumber,
    tax: existingUser.tax,
    gymAddress: existingUser.gymAddress,
    razorpayKeyId: existingUser.razorpayKeyId,
    razorpayKeySecret: existingUser.razorpayKeySecret,
    whatsappAccessToken: existingUser.whatsappAccessToken,
    whatsappPhoneNumberId: existingUser.whatsappPhoneNumberId,
    smtpHost: existingUser.smtpHost,
    smtpPort: existingUser.smtpPort,
    smtpUser: existingUser.smtpUser,
    smtpPass: existingUser.smtpPass
  };

  // Update fields if provided in the data or files (check if data exists before updating)
  if (data?.fullName) {
    updatedData.fullName = data.fullName;
    updatedFields.push('fullName');
  }
  if (data?.email) {
    updatedData.email = data.email;
    updatedFields.push('email');
  }
  if (data?.phone) {
    updatedData.phone = data.phone;
    updatedFields.push('phone');
  }
  if (data?.branchId) {
    updatedData.branchId = data.branchId;
    updatedFields.push('branchId');
  }
  if (data?.gymName !== undefined) {
    updatedData.gymName = data.gymName;
    updatedFields.push('gymName');
  }
  if (data?.address !== undefined) {
    updatedData.address = data.address;
    updatedFields.push('address');
  }
  if (data?.planName) {
    updatedData.planName = data.planName;
    updatedFields.push('planName');
  }
  if (data?.price) {
    updatedData.price = data.price;
    updatedFields.push('price');
  }
  if (data?.duration) {
    updatedData.duration = data.duration;
    updatedFields.push('duration');
  }
  if (data?.description) {
    updatedData.description = data.description;
    updatedFields.push('description');
  }
  if (data?.status) {
    updatedData.status = data.status;
    updatedFields.push('status');
  }

  // Only hash password if it's provided
  if (data?.password) {
    updatedData.password = await bcrypt.hash(data.password, 10);
    updatedFields.push('password');
  }

  // Handle profile image update if a new image is provided
  if (files?.profileImage) {
    updatedData.profileImage = await uploadToCloudinary(files.profileImage, "users/profile");
    updatedFields.push('profileImage');
  }

  if (data?.gstNumber !== undefined) {
  updatedData.gstNumber = data.gstNumber;
  updatedFields.push('gstNumber');
}

if (data?.tax !== undefined) {
  updatedData.tax = data.tax;
  updatedFields.push('tax');
}

if (data?.gymAddress !== undefined) {
  updatedData.gymAddress = data.gymAddress;
  updatedFields.push('gymAddress');
}

// ✅ Razorpay Keys
if (data?.razorpayKeyId !== undefined) {
  updatedData.razorpayKeyId = data.razorpayKeyId;
  updatedFields.push('razorpayKeyId');
}

if (data?.razorpayKeySecret !== undefined) {
  updatedData.razorpayKeySecret = data.razorpayKeySecret;
  updatedFields.push('razorpayKeySecret');
}

// ✅ WhatsApp Settings
if (data?.whatsappAccessToken !== undefined) {
  updatedData.whatsappAccessToken = data.whatsappAccessToken;
  updatedFields.push('whatsappAccessToken');
}

if (data?.whatsappPhoneNumberId !== undefined) {
  updatedData.whatsappPhoneNumberId = data.whatsappPhoneNumberId;
  updatedFields.push('whatsappPhoneNumberId');
}

// ✅ SMTP Settings
if (data?.smtpHost !== undefined) {
  updatedData.smtpHost = data.smtpHost;
  updatedFields.push('smtpHost');
}

if (data?.smtpPort !== undefined) {
  updatedData.smtpPort = data.smtpPort;
  updatedFields.push('smtpPort');
}

if (data?.smtpUser !== undefined) {
  updatedData.smtpUser = data.smtpUser;
  updatedFields.push('smtpUser');
}

if (data?.smtpPass !== undefined) {
  updatedData.smtpPass = data.smtpPass;
  updatedFields.push('smtpPass');
}

// ✅ Subscription Plan (Basic / Growth / Premium)
if (data?.subscriptionPlan) {
  updatedData.subscriptionPlan = data.subscriptionPlan;
  updatedFields.push('subscriptionPlan');
}

// ✅ License Expiry Date
if (data?.licenseExpiryDate) {
  updatedData.licenseExpiryDate = data.licenseExpiryDate;
  updatedFields.push('licenseExpiryDate');
}

// Convert trial to paid subscription if applicable
if (data?.subscriptionPlan) {
  updatedData.trialStatus = 'Converted';
  updatedFields.push('trialStatus');
  updatedData.status = 'Active'; // Re-activate if it was inactive
  updatedFields.push('status');

  // We should also send "SUBSCRIPTION_ACTIVATED" mock message here
  const [[template]] = await pool.query("SELECT * FROM message_templates WHERE eventKey = 'SUBSCRIPTION_ACTIVATED'");
  if (template) {
    const [[user]] = await pool.query("SELECT fullName, email, phone FROM user WHERE id = ?", [id]);
    if (user) {
      let msgBody = (template.message || "").replace('{Name}', user.fullName);
      // ✅ Send real Subscription Activated email + WhatsApp
      dispatchNotification({
        category: "saas_renewal_channel",
        toEmail: user.email,
        toPhone: user.phone || null,
        toUserId: id,
        subject: template.subject || "Subscription Activated — GymSoft",
        message: msgBody,
      }).catch(err => console.error("❌ Error sending subscription activation notification:", err.message));
    }
  }
}


  // Dynamically create the SQL query based on updated fields
  const setClause = updatedFields.map(field => `${field} = ?`).join(", ");

  // SQL query to update the user record with only the updated fields
  const sql = `UPDATE user SET ${setClause} WHERE id = ?`;

  // Collect the values for the query in the same order as the updated fields
  const queryValues = updatedFields.map(field => updatedData[field]);
  queryValues.push(id); // Add the user ID to the end of the query

  // Update the user record in the database
  await pool.query(sql, queryValues);

  // Fetch the updated user details and return
  return fetchUserById(id);
};

/**************************************
 * DELETE USER
 **************************************/
export const removeUser = async (id) => {
  const userId = Number(id);

  // ⭐ 1) Delete alerts where user is staff
  await pool.query("DELETE FROM alert WHERE staffId = ?", [userId]); // <-- added

  // ⭐ 2) Delete salary records where user is staff
  await pool.query("DELETE FROM salary WHERE staffId = ?", [userId]); // <-- added
await pool.query(
  `
  DELETE b
  FROM booking b
  INNER JOIN classschedule cs
    ON cs.id = b.scheduleId
  WHERE cs.trainerId = ?
  `,
  [userId]
);
  // ⭐ 3) Delete class schedules where user is trainer
  await pool.query("DELETE FROM classschedule WHERE trainerId = ?", [userId]); // <-- added

  // ⭐ 4) Delete sessions where user is trainer
  await pool.query("DELETE FROM session WHERE trainerId = ?", [userId]); // <-- added

  // ⭐ 5) Delete members where user is assigned
  await pool.query("DELETE FROM member WHERE userId = ?", [userId]); // <-- added

  // ⭐ 5.5) Delete member_plan_assignment where plan belongs to admin
  await pool.query(`
    DELETE mpa
    FROM member_plan_assignment mpa
    INNER JOIN memberplan p ON p.id = mpa.planId
    WHERE p.adminId = ?
  `, [userId]);

  // ⭐ 6) Delete memberplan where user is admin
  await pool.query(
    "DELETE FROM memberplan WHERE adminId = ?",
    [userId]
  );

  // ⭐ 7) Delete branch where user is admin
  await pool.query(
    "DELETE FROM branch WHERE adminId = ?",
    [userId]
  );

  // ⭐ 7.1) Delete tenant integrations
  await pool.query("DELETE FROM tenantintegrationsettings WHERE tenantId = ?", [userId]);

  // ⭐ 7.2) Delete leads
  await pool.query("DELETE FROM leads WHERE adminId = ?", [userId]);

  // ⭐ 7.3) Delete saas_payments
  await pool.query("DELETE FROM saas_payments WHERE adminId = ?", [userId]);

  // ⭐ 8) Finally delete user
  await pool.query("DELETE FROM user WHERE id = ?", [userId]); // <-- unchanged

  return true;
};



/**************************************
 * GET ADMINS ONLY
 **************************************/
export const fetchAdmins = async () => {
  const sql = `
    SELECT u.*, r.name AS roleName,
           p.category AS planCategory,
           p.name AS planDisplayName,
           p.duration AS planDuration
    FROM user u
    LEFT JOIN role r ON r.id = u.roleId
    LEFT JOIN plan p ON LOWER(TRIM(p.name)) = LOWER(TRIM(u.planName))
    WHERE u.roleId = 2
    ORDER BY u.id DESC
  `;

  const [rows] = await pool.query(sql);
  return rows;
};


/**************************************
 * DASHBOARD STATS
 **************************************/
export const fetchDashboardStats = async () => {
  const [[{ totalAdmins }]] = await pool.query(
    "SELECT COUNT(*) AS totalAdmins FROM user WHERE roleId = 2"
  );

  const [[{ totalBranches }]] = await pool.query(
    "SELECT COUNT(*) AS totalBranches FROM branch"
  );

  const [[{ newUsersToday }]] = await pool.query(
    "SELECT COUNT(*) AS newUsersToday FROM user WHERE DATE(createdAt) = CURDATE()"
  );

  return { totalAdmins, totalBranches, newUsersToday };
};


/**************************************
 * LOGIN MEMBER (NO BCRYPT)
 **************************************/
export const loginMemberService = async ({ email, password, bypassPassword = false }) => {
  const sql = `
    SELECT m.*, b.name AS branchName
    FROM member m
    LEFT JOIN branch b ON b.id = m.branchId
    WHERE m.email = ?
  `;

  const [rows] = await pool.query(sql, [email]);
  const member = rows[0];

  if (!member) throw { status: 400, message: "Invalid email or password" };

  if (member.status !== "ACTIVE") {
    throw { status: 403, message: "Account disabled" };
  }

  if (!bypassPassword && member.password !== password) {
    throw { status: 400, message: "Invalid email or password" };
  }

  const token = jwt.sign(
    { id: member.id, role: "MEMBER" },
    ENV.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    token,
    member: {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      branchId: member.branchId,
      branchName: member.branchName,
    }
  };
};

/**************************************
 * CHANGE PASSWORD
 **************************************/
export const changeUserPassword = async (id, oldPassword, newPassword) => {
  // 1. Fetch user first
  const [rows] = await pool.query("SELECT * FROM user WHERE id = ?", [id]);
  const user = rows[0];

  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  // 2. Compare old password
  let match = false;
  try {
    match = await bcrypt.compare(oldPassword, user.password);
  } catch (e) {}

  if (!match && user.password === oldPassword) match = true;
  if (!match && user.visiblePassword === oldPassword) match = true;

  if (!match) {
    throw { status: 400, message: "Old password is incorrect" };
  }

  // 3. Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 4. Update password
  await pool.query(
    "UPDATE user SET password = ?, visiblePassword = ? WHERE id = ?",
    [hashedPassword, newPassword, id]
  );

  return { message: "Password updated successfully" };
};


// export const getAdminDashboardData = async () => {
//   const sql = `
//     SELECT 
//       -- Total Branches
//       (SELECT COUNT(*) FROM branch WHERE status = 'Active') AS totalBranches,

//       -- Total Members (roleId = 4)
//       (SELECT COUNT(*) FROM user WHERE roleId = 4 AND status = 'Active') AS totalMembers,

//       -- Active Staff Count
//       (SELECT COUNT(*) FROM staff WHERE status = 'Active') AS totalStaff,

//       -- Today's Member Check-ins
//       (SELECT COUNT(*) FROM memberattendance 
//        WHERE DATE(checkIn) = CURDATE()) AS todaysMemberCheckins,

//       -- Today's Staff Check-ins
//       (SELECT COUNT(*) FROM staffattendance 
//        WHERE DATE(checkIn) = CURDATE()) AS todaysStaffCheckins
//   `;

//   const [rows] = await pool.query(sql);

//   if (!rows.length) {
//     throw { status: 404, message: "No dashboard data found" };
//   }

//   return rows[0];
// };





// export const getAdminDashboardData = async (adminId) => {
//   // 5 CARDS
//   const statsQuery = `
//     SELECT 
//       -- Branch count
//       (SELECT COUNT(*) FROM branch 
//         WHERE status = 'ACTIVE' AND adminId = ?) AS totalBranches,

//       -- Member count (roleId = 4)
//       (SELECT COUNT(*) FROM user 
//         WHERE roleId = 4 AND status = 'ACTIVE' AND adminId = ?) AS totalMembers,

//       -- Staff count
//       (SELECT COUNT(*) FROM staff 
//         WHERE status = 'Active' AND adminId = ?) AS totalStaff,

//       -- Today's Member Check-ins (JOIN member → user → adminId)
//       (SELECT COUNT(*) FROM memberattendance ma
//         JOIN user u ON ma.memberId = u.id
//         WHERE u.adminId = ?
//         AND DATE(ma.checkIn) = CURDATE()
//       ) AS todaysMemberCheckins,

//       -- Today's Staff Check-ins (JOIN staff → adminId)
//       (SELECT COUNT(*) FROM staffattendance sa
//         JOIN staff s ON sa.staffId = s.id
//         WHERE s.adminId = ?
//         AND DATE(sa.checkIn) = CURDATE()
//       ) AS todaysStaffCheckins
//   `;

//   // MEMBER GROWTH (Admin-wise last 6 months)
//   const memberGrowthQuery = `
//     SELECT 
//       DATE_FORMAT(MIN(createdAt), '%b') AS month,
//       COUNT(*) AS count
//     FROM user
//     WHERE roleId = 4
//       AND adminId = ?
//       AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
//     GROUP BY YEAR(createdAt), MONTH(createdAt)
//     ORDER BY YEAR(createdAt), MONTH(createdAt);
//   `;

//   // recent activity
// const recentActivitiesQuery = `
// (
//   SELECT 
//     CONCAT('New member registration: ', fullName) AS activity,
//     joinDate AS time,
//     'member' AS type
//   FROM member
//   WHERE adminId = ?
// )

// UNION ALL

// (
//   SELECT 
//     CONCAT('Payment received: ₹', amount) AS activity,
//     createdAt AS time,
//     'payment' AS type
//   FROM payment
//   WHERE adminId = ?
// )

// UNION ALL

// (
//   SELECT 
//     CONCAT('Class booking by Member ID ', memberId) AS activity,
//     createdAt AS time,
//     'class_booking' AS type
//   FROM booking_requests
//   WHERE adminId = ?
// )

// UNION ALL

// (
//   SELECT 
//     CONCAT('Staff check-in: Staff ID ', sa.staffId) AS activity,
//     sa.checkIn AS time,
//     'staff_checkin' AS type
//   FROM staffattendance sa
//   JOIN staff s ON sa.staffId = s.id
//   WHERE s.adminId = ?
// )

// ORDER BY time DESC
// LIMIT 5;
// `;
  

// const [recentActivities] = await pool.query(recentActivitiesQuery, [
//   adminId,
//   adminId,
//   adminId,
//   adminId
// ]);

//   const [stats] = await pool.query(statsQuery, [
//     adminId,
//     adminId,
//     adminId,
//     adminId,
//     adminId,
//   ]);

//   const [memberGrowth] = await pool.query(memberGrowthQuery, [adminId]);

//   return {
//     ...stats[0],
//     memberGrowth,
//      recentActivities
//   };
// };


export const getAdminDashboardData = async (adminId, branchId = null, monthStr = null, chartPeriod = 6) => {
  const bId = (branchId === "all" || branchId === "") ? null : branchId;

  // Ensure monthStr is valid (e.g. '2026-07'), default to current month
  let targetMonth = monthStr;
  if (!targetMonth) {
    const today = new Date();
    targetMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  // Determine chart grouping logic
  const isOneMonth = chartPeriod === 1;
  const dateFormatMember = isOneMonth ? "DATE_FORMAT(MIN(createdAt), '%d %b')" : "DATE_FORMAT(MIN(createdAt), '%b')";
  const groupByMember = isOneMonth ? "DATE(createdAt)" : "YEAR(createdAt), MONTH(createdAt)";
  const orderByMember = isOneMonth ? "DATE(createdAt)" : "YEAR(createdAt), MONTH(createdAt)";
  
  const dateFormatRevenue = isOneMonth ? "DATE_FORMAT(MIN(p.paymentDate), '%d %b')" : "DATE_FORMAT(MIN(p.paymentDate), '%b')";
  const groupByRevenue = isOneMonth ? "DATE(p.paymentDate)" : "YEAR(p.paymentDate), MONTH(p.paymentDate)";
  const orderByRevenue = isOneMonth ? "DATE(p.paymentDate)" : "YEAR(p.paymentDate), MONTH(p.paymentDate)";

  const dateFormatExpense = isOneMonth ? "DATE_FORMAT(MIN(e.date), '%d %b')" : "DATE_FORMAT(MIN(e.date), '%b')";
  const groupByExpense = isOneMonth ? "DATE(e.date)" : "YEAR(e.date), MONTH(e.date)";
  const orderByExpense = isOneMonth ? "DATE(e.date)" : "YEAR(e.date), MONTH(e.date)";

  const dateFormatSalary = isOneMonth ? "DATE_FORMAT(MIN(s.periodEnd), '%d %b')" : "DATE_FORMAT(MIN(s.periodEnd), '%b')";
  const groupBySalary = isOneMonth ? "DATE(s.periodEnd)" : "YEAR(s.periodEnd), MONTH(s.periodEnd)";
  const orderBySalary = isOneMonth ? "DATE(s.periodEnd)" : "YEAR(s.periodEnd), MONTH(s.periodEnd)";

  // 5 CARDS
  const statsQuery = `
    SELECT 
      -- Member count (roleId = 4)
     (SELECT COUNT(*) 
 FROM member 
 WHERE adminId = ?
) AS totalMembers,


      -- Staff count
      (SELECT COUNT(*) FROM staff 
        WHERE status = 'Active' AND adminId = ?
        ) AS totalStaff,

      -- Today's Member Check-ins (JOIN member → user → adminId)
      (SELECT COUNT(*) FROM memberattendance ma
        JOIN member m ON ma.memberId = m.id
        WHERE m.adminId = ?
        ${bId ? "AND m.branchId = ?" : ""}
        AND DATE(CONVERT_TZ(ma.checkIn, '+00:00', '+05:30')) = ?
      ) AS todaysMemberCheckins,

      -- Today's Member Check-outs
      (SELECT COUNT(*) FROM memberattendance ma
        JOIN member m ON ma.memberId = m.id
        WHERE m.adminId = ?
        ${bId ? "AND m.branchId = ?" : ""}
        AND ma.checkOut IS NOT NULL
        AND DATE(CONVERT_TZ(ma.checkOut, '+00:00', '+05:30')) = ?
      ) AS todaysMemberCheckouts,

      -- Today's Staff Check-ins (JOIN staff → adminId)
      (SELECT COUNT(*) 
        FROM staffattendance sa
        JOIN staff s ON sa.staffId = s.id
        WHERE s.adminId = ?
        ${bId ? "AND s.branchId = ?" : ""}
        AND DATE(CONVERT_TZ(sa.checkIn, '+00:00', '+05:30')) = ?
      ) AS todaysStaffCheckins
  `;

  // MEMBER GROWTH (Admin-wise)
  const memberGrowthQuery = `
    SELECT 
      ${dateFormatMember.replace(/createdAt/g, 'joinDate')} AS month,
      COUNT(*) AS count
    FROM member
    WHERE adminId = ?
      ${bId ? "AND branchId = ?" : ""}
      AND joinDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY ${groupByMember.replace(/createdAt/g, 'joinDate')}
    ORDER BY ${orderByMember.replace(/createdAt/g, 'joinDate')};
  `;

  // recent activity
const recentActivitiesQuery = `
  (
    SELECT 
      CONCAT('New member registration: ', fullName) AS activity,
      CONVERT_TZ(joinDate, '+00:00', '+05:30') AS time,
      'member' AS type
    FROM member
    WHERE adminId = ?
    ${bId ? "AND branchId = ?" : ""}
  )

  UNION ALL

  (
    SELECT 
      CONCAT('Class booking by Member ID ', memberId) AS activity,
      CONVERT_TZ(createdAt, '+00:00', '+05:30') AS time,
      'class_booking' AS type
    FROM booking_requests
    WHERE adminId = ?
  )

  UNION ALL

  (
    SELECT 
      CONCAT('Staff check-in: Staff ID ', sa.staffId) AS activity,
      CONVERT_TZ(sa.checkIn, '+00:00', '+05:30') AS time,
      'staff_checkin' AS type
    FROM staffattendance sa
    JOIN staff s ON sa.staffId = s.id
    WHERE s.adminId = ?
    ${bId ? "AND s.branchId = ?" : ""}
  )

  UNION ALL

  (
    SELECT 
      CONCAT('Member check-in: ', m.fullName) AS activity,
      CONVERT_TZ(ma.checkIn, '+00:00', '+05:30') AS time,
      'member_checkin' AS type
    FROM memberattendance ma
    JOIN member m ON ma.memberId = m.id
    WHERE m.adminId = ?
    ${bId ? "AND m.branchId = ?" : ""}
  )

  UNION ALL

  (
    SELECT 
      CONCAT('Member check-out: ', m.fullName) AS activity,
      CONVERT_TZ(ma.checkOut, '+00:00', '+05:30') AS time,
      'member_checkout' AS type
    FROM memberattendance ma
    JOIN member m ON ma.memberId = m.id
    WHERE m.adminId = ?
    ${bId ? "AND m.branchId = ?" : ""}
    AND ma.checkOut IS NOT NULL
  )

  ORDER BY time DESC
  LIMIT 15;
  `;

  // REVENUE GROWTH (Admin-wise)
  const revenueGrowthQuery = `
    SELECT 
      ${dateFormatRevenue} AS month,
      MIN(p.paymentDate) AS rawDate,
      SUM(p.amount) AS totalRevenue
    FROM (
      SELECT m.joinDate AS paymentDate, COALESCE(m.amountPaid, 0) AS amount
      FROM member m
      WHERE m.adminId = ?
        ${bId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
        AND m.joinDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        
      UNION ALL
      
      SELECT pt.paymentDate AS paymentDate, COALESCE(pt.amount, 0) AS amount
      FROM payment pt
      JOIN member mt ON pt.memberId = mt.id
      WHERE mt.adminId = ?
        ${bId ? "AND (mt.branchId = ? OR mt.branchId IS NULL)" : ""}
        AND pt.paymentDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    ) p
    GROUP BY ${groupByRevenue}
    ORDER BY ${orderByRevenue};
  `;

  // EXPENSE GROWTH
  const expenseGrowthQuery = `
    SELECT 
      ${dateFormatExpense} AS month,
      MIN(e.date) AS rawDate,
      SUM(e.amount) AS totalExpense
    FROM expense e
    JOIN branch b ON e.branchId = b.id
    WHERE b.adminId = ?
      ${bId ? "AND (e.branchId = ? OR e.branchId IS NULL)" : ""}
      AND e.date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY ${groupByExpense}
    ORDER BY ${orderByExpense};
  `;

  // SALARY GROWTH
  const salaryGrowthQuery = `
    SELECT 
      ${dateFormatSalary} AS month,
      MIN(s.periodEnd) AS rawDate,
      SUM(s.netPay) AS totalSalary
    FROM salary s
    JOIN staff st ON s.staffId = st.id
    WHERE st.adminId = ?
      ${bId ? "AND (st.branchId = ? OR st.branchId IS NULL)" : ""}
      AND s.periodEnd >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY ${groupBySalary}
    ORDER BY ${orderBySalary};
  `;

  // RECENT PAYMENTS
  const recentPaymentsQuery = `
    SELECT 
      p.id,
      m.fullName as memberName,
      p.amount,
      p.paymentDate as date,
      p.invoiceNo
    FROM payment p
    JOIN member m ON p.memberId = m.id
    WHERE m.adminId = ?
      ${bId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
    ORDER BY p.paymentDate DESC
    LIMIT 10;
  `;

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // 'YYYY-MM-DD'

  const statsParams = [];
  // 1. totalMembers
  statsParams.push(adminId);
  // 2. totalStaff
  statsParams.push(adminId);
  // 3. todaysMemberCheckins
  statsParams.push(adminId); if (bId) statsParams.push(bId);
  statsParams.push(todayStr);
  // 4. todaysMemberCheckouts
  statsParams.push(adminId); if (bId) statsParams.push(bId);
  statsParams.push(todayStr);
  // 5. todaysStaffCheckins
  statsParams.push(adminId); if (bId) statsParams.push(bId);
  statsParams.push(todayStr);

  const [stats] = await pool.query(statsQuery, statsParams);

  const growthParams = [adminId];
  if (bId) growthParams.push(bId);
  growthParams.push(chartPeriod);
  const [memberGrowth] = await pool.query(memberGrowthQuery, growthParams);

  const recentParams = [];
  recentParams.push(adminId); if (bId) recentParams.push(bId); // members
  recentParams.push(adminId); // booking_requests
  recentParams.push(adminId); if (bId) recentParams.push(bId); // staff checkin
  recentParams.push(adminId); if (bId) recentParams.push(bId); // member checkin
  recentParams.push(adminId); if (bId) recentParams.push(bId); // member checkout

  const [recentActivities] = await pool.query(recentActivitiesQuery, recentParams);

  const revenueParams = [adminId];
  if (bId) revenueParams.push(bId);
  revenueParams.push(chartPeriod);
  
  const fullRevenueParams = [...revenueParams, ...revenueParams];
  const [revenueGrowth] = await pool.query(revenueGrowthQuery, fullRevenueParams);
  
  const [expenseGrowth] = await pool.query(expenseGrowthQuery, revenueParams);
  const [salaryGrowth] = await pool.query(salaryGrowthQuery, revenueParams);

  // Calculate profitGrowth
  const profitMap = {};
  revenueGrowth.forEach(r => profitMap[r.month] = { month: r.month, rawDate: r.rawDate, revenue: Number(r.totalRevenue || 0), expense: 0 });
  
  expenseGrowth.forEach(e => {
    if (!profitMap[e.month]) profitMap[e.month] = { month: e.month, rawDate: e.rawDate, revenue: 0, expense: 0 };
    profitMap[e.month].expense += Number(e.totalExpense || 0);
  });
  
  salaryGrowth.forEach(s => {
    if (!profitMap[s.month]) profitMap[s.month] = { month: s.month, rawDate: s.rawDate, revenue: 0, expense: 0 };
    profitMap[s.month].expense += Number(s.totalSalary || 0);
  });

  const profitGrowth = Object.values(profitMap)
    .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
    .map(p => ({ month: p.month, totalProfit: p.revenue - p.expense }));

  const paymentParams = [adminId];
  if (bId) paymentParams.push(bId);
  const [recentPayments] = await pool.query(recentPaymentsQuery, paymentParams);

  // Financial KPIs based on monthStr
  const monthFilter = `${targetMonth}-01`;

  const [[monthRevRow]] = await pool.query(
    `SELECT (
       COALESCE((
         SELECT SUM(p.amount)
         FROM payment p
         JOIN member m ON p.memberId = m.id
         WHERE m.adminId = ?
           ${bId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
           AND DATE_FORMAT(p.paymentDate, '%Y-%m') = ?
       ), 0) +
       COALESCE((
         SELECT SUM(m.amountPaid)
         FROM member m
         WHERE m.adminId = ?
           ${bId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
           AND DATE_FORMAT(m.joinDate, '%Y-%m') = ?
       ), 0)
     ) AS total`,
    bId ? [adminId, bId, targetMonth, adminId, bId, targetMonth] : [adminId, targetMonth, adminId, targetMonth]
  ).catch(() => [[{ total: 0 }]]);

  const monthlyRevenue = Number(monthRevRow?.total || 0);

  const [[monthExpRow]] = await pool.query(
    `SELECT COALESCE(SUM(e.amount), 0) AS total 
     FROM expense e
     JOIN branch b ON e.branchId = b.id
     WHERE b.adminId = ?
       ${bId ? "AND (e.branchId = ? OR e.branchId IS NULL)" : ""}
       AND DATE_FORMAT(e.date, '%Y-%m') = ?`,
    bId ? [adminId, bId, targetMonth] : [adminId, targetMonth]
  ).catch((err) => { console.error(err); return [[{ total: 0 }]]; });

  const [[monthSalRow]] = await pool.query(
    `SELECT COALESCE(SUM(s.netPay), 0) AS total 
     FROM salary s
     JOIN staff st ON s.staffId = st.id
     WHERE st.adminId = ?
       ${bId ? "AND (st.branchId = ? OR st.branchId IS NULL)" : ""}
       AND DATE_FORMAT(s.periodEnd, '%Y-%m') = ?`,
    bId ? [adminId, bId, targetMonth] : [adminId, targetMonth]
  ).catch((err) => { console.error(err); return [[{ total: 0 }]]; });

  const monthlyExpenses = Number(monthExpRow?.total || 0) + Number(monthSalRow?.total || 0);
  const monthlyProfit = monthlyRevenue - monthlyExpenses;

  const upcomingExpiriesParams = [adminId];
  if (bId) upcomingExpiriesParams.push(bId);

  const [upcomingExpiries] = await pool.query(
    `SELECT m.id, m.fullName, m.email, m.phone, m.membershipTo, p.name AS planName 
     FROM member m
     LEFT JOIN memberplan p ON m.planId = p.id
     WHERE m.adminId = ?
       ${bId ? "AND (m.branchId = ? OR m.branchId IS NULL)" : ""}
       AND m.membershipTo IS NOT NULL
       AND m.membershipTo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY m.membershipTo ASC`,
    upcomingExpiriesParams
  );

  return {
    ...stats[0],
    memberGrowth,
    recentActivities,
    revenueGrowth,
    profitGrowth,
    recentPayments,
    monthlyRevenue,
    monthlyExpenses,
    monthlyProfit,
    upcomingExpiries
  };
};



// --- FORGOT PASSWORD FLOW ---
const logAuthAudit = async (email, event, ipAddress, userAgent, details) => {
  try {
    await pool.query(
      "INSERT INTO auth_audit_log (email, event, ipAddress, userAgent, details) VALUES (?, ?, ?, ?, ?)",
      [email, event, ipAddress, userAgent, JSON.stringify(details)]
    );
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

export const getAccountByEmail = async (email) => {
  const [users] = await pool.query("SELECT * FROM user WHERE email = ?", [email]);
  const [members] = await pool.query("SELECT * FROM member WHERE email = ?", [email]);

  // Prioritize User (Admin/Staff) over Member if both exist
  if (users.length > 0) {
    if (users.length > 1) {
      throw new Error("Multiple user accounts found with this email. Please contact support.");
    }
    const user = users[0];
    return {
      id: user.id,
      type: "USER",
      name: user.fullName || user.gymName || 'User',
      password: user.password,
      data: user,
    };
  }

  if (members.length > 0) {
    if (members.length > 1) {
      throw new Error("Multiple member accounts found with this email. Please contact support.");
    }
    const member = members[0];
    return {
      id: member.id,
      type: "MEMBER",
      name: member.fullName || 'Member',
      password: member.password,
      data: member,
    };
  }

  return null;
};

export const forgotPasswordService = async (email, ip, userAgent) => {
  try {
    // 1. Rate Limiting: Max 5 requests per hour
    const [recentRequests] = await pool.query(
      "SELECT COUNT(*) as count FROM password_reset_otp WHERE email = ? AND createdAt >= NOW() - INTERVAL 1 HOUR",
      [email]
    );
    
    if (recentRequests[0].count >= 5) {
      await logAuthAudit(email, 'OTP_FAILED', ip, userAgent, { reason: 'Rate limit exceeded' });
      return { success: true, message: "If an account with this email exists, an OTP has been sent." }; // Enumeration protection
    }

    const account = await getAccountByEmail(email);
    if (!account) {
      await logAuthAudit(email, 'OTP_FAILED', ip, userAgent, { reason: 'Account not found' });
      return { success: true, message: "If an account with this email exists, an OTP has been sent." }; // Enumeration protection
    }

    // 2. Generate OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Save to DB
    await pool.query(
      `INSERT INTO password_reset_otp 
       (userId, userType, email, otp, expiresAt, createdByIP, userAgent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [account.id, account.type, email, hashedOtp, expiresAt, ip, userAgent]
    );

    // 4. Send Email via Notification Service
    try {
      await sendTemplatedNotification({
        eventKey: 'FORGOT_PASSWORD_OTP',
        tenantId: account.type === 'USER' ? (account.data.roleId === 1 ? account.id : account.data.adminId || account.id) : account.data.adminId || 1,
        receiverId: account.id,
        receiverRole: account.type === 'USER' ? 'Admin/Staff' : 'Member',
        receiverEmail: email,
        receiverPhone: null,
        variables: {
          Name: account.name,
          OTP: rawOtp,
          CompanyName: 'Gym Management'
        }
      });
      await logAuthAudit(email, 'OTP_GENERATED', ip, userAgent, { success: true });
    } catch (err) {
      await logAuthAudit(email, 'SMTP_FAILURE', ip, userAgent, { reason: err.message });
      // DO NOT CRASH, continue to return generic success
    }

    return { success: true, message: "If an account with this email exists, an OTP has been sent." };
  } catch (error) {
    // Hide DB errors from API, return generic response
    console.error("Forgot password error:", error.message);
    if (error.message.includes("Multiple accounts")) {
      throw new Error(error.message);
    }
    return { success: true, message: "If an account with this email exists, an OTP has been sent." };
  }
};

export const verifyOtpService = async (email, rawOtp) => {
  const [otps] = await pool.query(
    "SELECT * FROM password_reset_otp WHERE email = ? AND isUsed = FALSE ORDER BY id DESC LIMIT 1",
    [email]
  );

  if (otps.length === 0) {
    return { success: false, message: "Invalid or expired OTP." };
  }

  const record = otps[0];

  if (new Date() > new Date(record.expiresAt)) {
    return { success: false, message: "OTP has expired." };
  }

  if (record.attempts >= 5) {
    return { success: false, message: "Maximum attempts reached. Please request a new OTP." };
  }

  await pool.query("UPDATE password_reset_otp SET attempts = attempts + 1 WHERE id = ?", [record.id]);

  const isValid = await bcrypt.compare(rawOtp, record.otp);
  if (!isValid) {
    return { success: false, message: "Invalid OTP." };
  }

  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = await bcrypt.hash(rawResetToken, 10);
  const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    "UPDATE password_reset_otp SET isVerified = TRUE, resetToken = ?, tokenExpiresAt = ? WHERE id = ?",
    [hashedResetToken, tokenExpiresAt, record.id]
  );
  
  await logAuthAudit(email, 'OTP_VERIFIED', null, null, { success: true });

  return { 
    success: true, 
    message: "OTP Verified successfully.",
    resetToken: rawResetToken 
  };
};

export const resendOtpService = async (email, ip, userAgent) => {
  const [recent] = await pool.query(
    "SELECT id FROM password_reset_otp WHERE email = ? AND createdAt >= NOW() - INTERVAL 60 SECOND",
    [email]
  );

  if (recent.length > 0) {
    return { success: false, message: "Please wait 60 seconds before requesting a new OTP." };
  }

  await pool.query("UPDATE password_reset_otp SET isUsed = TRUE WHERE email = ? AND isUsed = FALSE", [email]);

  return await forgotPasswordService(email, ip, userAgent);
};

export const loginWithResetTokenService = async (email, resetToken, ip, userAgent) => {
  const [otps] = await pool.query(
    "SELECT * FROM password_reset_otp WHERE email = ? AND isVerified = TRUE AND isUsed = FALSE ORDER BY id DESC LIMIT 1",
    [email]
  );

  if (otps.length === 0) {
    return { success: false, message: "Invalid or expired reset token." };
  }

  const record = otps[0];
  if (!record.resetToken || new Date() > new Date(record.tokenExpiresAt)) {
    return { success: false, message: "Reset token has expired. Please request a new OTP." };
  }

  const isValidToken = await bcrypt.compare(resetToken, record.resetToken);
  if (!isValidToken) {
    return { success: false, message: "Invalid reset token." };
  }

  const account = await getAccountByEmail(email);
  if (!account) {
    return { success: false, message: "Account not found." };
  }

  // Mark token as used since they are logging in
  await pool.query("UPDATE password_reset_otp SET isUsed = TRUE WHERE id = ?", [record.id]);
  await logAuthAudit(email, 'LOGIN_WITH_OTP', ip, userAgent, { success: true });

  // Generate token and user payload
  if (account.type === 'USER') {
    const data = await loginUser({ email, password: '', bypassPassword: true });
    return { success: true, ...data };
  } else {
    const data = await loginMemberService({ email, password: '', bypassPassword: true });
    return { success: true, ...data };
  }
};

export const resetPasswordService = async (email, resetToken, newPassword, confirmPassword) => {
  if (newPassword !== confirmPassword) {
    return { success: false, message: "Passwords do not match." };
  }

  const passRegex = /^(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!passRegex.test(newPassword)) {
    return { success: false, message: "Password must be at least 8 characters, include a number and a special character." };
  }

  const [otps] = await pool.query(
    "SELECT * FROM password_reset_otp WHERE email = ? AND isVerified = TRUE AND isUsed = FALSE ORDER BY id DESC LIMIT 1",
    [email]
  );

  if (otps.length === 0) {
    return { success: false, message: "Invalid or expired reset token." };
  }

  const record = otps[0];
  if (!record.resetToken || new Date() > new Date(record.tokenExpiresAt)) {
    return { success: false, message: "Reset token has expired. Please request a new OTP." };
  }

  const isValidToken = await bcrypt.compare(resetToken, record.resetToken);
  if (!isValidToken) {
    return { success: false, message: "Invalid reset token." };
  }

  const account = await getAccountByEmail(email);
  if (!account) {
    return { success: false, message: "Account not found." };
  }

  const table = account.type === 'USER' ? 'user' : 'member';
  const [dbUser] = await pool.query(`SELECT password FROM ${table} WHERE id = ?`, [account.id]);
  const isSamePassword = await bcrypt.compare(newPassword, dbUser[0].password);
  
  if (isSamePassword) {
    return { success: false, message: "New password cannot be the same as your current password." };
  }

  const newHashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE ${table} SET password = ? WHERE id = ?`, [newHashedPassword, account.id]);

  await pool.query("UPDATE password_reset_otp SET isUsed = TRUE WHERE id = ?", [record.id]);
  
  await logAuthAudit(email, 'PASSWORD_CHANGED', null, null, { success: true });

  try {
    await sendTemplatedNotification({
      eventKey: 'PASSWORD_CHANGED',
      tenantId: account.type === 'USER' ? (account.data.roleId === 1 ? account.id : account.data.adminId || account.id) : account.data.adminId || 1,
      receiverId: account.id,
      receiverRole: account.type === 'USER' ? 'Admin/Staff' : 'Member',
      receiverEmail: email,
      receiverPhone: null,
      variables: {}
    });
  } catch (err) {
    console.error("Password Changed notification failed:", err.message);
  }

  return { success: true, message: "Password updated successfully. Please log in with your new password." };
};
