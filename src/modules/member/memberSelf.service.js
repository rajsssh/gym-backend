// db connection import
import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";

/*******************************************************
 * GET MEMBER PROFILE (using userId)
 * Step-by-step: user → member → plan
 *******************************************************/
export const getMemberProfileService = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT
        u.id AS userId,
        u.fullName,
        u.email,
        u.phone,
        u.address,
        u.branchId,
        u.status AS userStatus,
        u.dateOfBirth,  -- Correct column name here
        u.profileImage,
        u.gstNumber,
        u.tax,
        u.gymAddress,
        u.gymName,

        m.id AS memberId,
        m.gender,
        m.joinDate,
        m.planId,
        m.membershipFrom,
        m.membershipTo,
        m.paymentMode,
        m.interestedIn,
        m.amountPaid,
        m.status AS memberStatus,

        COALESCE(p.name, 'No Plan') AS membership_plan,
        COALESCE(p.price, 0) AS membership_fee,
        COALESCE(p.validityDays, 'N/A') AS plan_duration

      FROM user u
      LEFT JOIN member m ON m.userId = u.id
      LEFT JOIN memberplan p ON p.id = m.planId
      WHERE u.id = ?
    `,
    [userId]
  );

  // Check if no rows are returned
  if (rows.length === 0) {
    throw { status: 404, message: "Member not found" };
  }

  const m = rows[0];

  const nameParts = (m.fullName || "").trim().split(" ");
  m.first_name = nameParts[0] || "";
  m.last_name = nameParts.slice(1).join(" ") || "";

  // Formatting dates
  m.plan_start_date = m.membershipFrom ? m.membershipFrom.toISOString().split("T")[0] : "";
  m.plan_end_date = m.membershipTo ? m.membershipTo.toISOString().split("T")[0] : "";
  m.date_of_birth = m.dateOfBirth ? m.dateOfBirth.toISOString().split("T")[0] : "";

  const addr = (m.address || "").split(",");
  m.address_street = addr[0]?.trim() || "";
  m.address_city = addr[1]?.trim() || "";
  m.address_state = addr[2]?.trim() || "";
  m.address_zip = addr[3]?.trim() || "";

  // ✅ Fetch all assigned plans from member_plan_assignment
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
    [m.memberId]
  );

  return {
    userId: m.userId,
    memberId: m.memberId, // ✅ Return memberId in profile response
    fullName: m.fullName,
    first_name: m.first_name,
    last_name: m.last_name,
    email: m.email,
    phone: m.phone,
    gstNumber: m.gstNumber,
    tax: m.tax,
    gymName: m.gymName,
    gymAddress: m.gymAddress,
    address_street: m.address_street,
    address_city: m.address_city,
    address_state: m.address_state,
    address_zip: m.address_zip,
    gender: m.gender,
    profileImage: m.profileImage || null,
    date_of_birth: m.date_of_birth,
    plan_start_date: m.plan_start_date,
    plan_end_date: m.plan_end_date,
    membership_plan: m.membership_plan, // Keep for backward compatibility
    membership_fee: m.membership_fee,
    plan_duration: m.plan_duration,
    membership_status: m.memberStatus,
    paymentMode: m.paymentMode,
    interestedIn: m.interestedIn,
    amountPaid: m.amountPaid,
    assignedPlans: assignedPlans || [] // ✅ Multiple plans array
  };
};





/*******************************************************
 * UPDATE PERSONAL INFO (using userId)
 * Step-by-step: read → fallback → update member → update user
 *******************************************************/
// export const updateMemberPersonalService = async (userId, data) => {
//   const {
//     first_name,
//     last_name,
//     gender,
//     dob,
//     email,
//     phone,
//     address_street,
//     address_city
//   } = data;

//   /************************************************
//    * 1) USER TABLE CHECK → user must exist
//    ************************************************/
//   const [[userRow]] = await pool.query(
//     `SELECT fullName, email, phone, address FROM user WHERE id = ?`,
//     [userId]
//   );

//   if (!userRow) {
//     throw { status: 404, message: "User not found" };
//   }

//   /************************************************
//    * 2) MEMBER TABLE CHECK → row may be missing
//    ************************************************/
//   const [[memberRow]] = await pool.query(
//     `
//       SELECT fullName, email, phone, gender, dateOfBirth, address
//       FROM member
//       WHERE userId = ?
//     `,
//     [userId]
//   );

//   /************************************************
//    * 3) AUTO-CREATE MEMBER ROW IF MISSING
//    ************************************************/
//   if (!memberRow) {
//     await pool.query(
//       `
//         INSERT INTO member 
//         (userId, adminId, fullName, email, phone, gender, address, branchId)
//         VALUES (?, 1, ?, ?, ?, NULL, NULL, NULL)
//       `,
//       [userId, userRow.fullName, userRow.email, userRow.phone]
//     );

//     // re-fetch for update
//     const [[refetch]] = await pool.query(
//       `SELECT * FROM member WHERE userId = ?`,
//       [userId]
//     );

//     memberRow = refetch;
//   }

//   /************************************************
//    * 4) SAFE FALLBACK LOGIC
//    ************************************************/
//   const fullName =
//     first_name && last_name
//       ? `${first_name} ${last_name}`.trim()
//       : memberRow.fullName;

//   const updatedEmail = email || memberRow.email;
//   const updatedPhone = phone || memberRow.phone;
//   const updatedGender = gender || memberRow.gender;
//   const updatedDob = dob ? new Date(dob) : memberRow.dateOfBirth;

//   const address =
//     address_street || address_city
//       ? [address_street, address_city].filter(Boolean).join(", ")
//       : memberRow.address;

//   /************************************************
//    * 5) EMAIL UNIQUE CHECK
//    ************************************************/
//   const [exists] = await pool.query(
//     `SELECT id FROM member WHERE email = ? AND userId != ?`,
//     [updatedEmail, userId]
//   );

//   if (exists.length > 0) {
//     throw { status: 400, message: "Email already in use" };
//   }

//   /************************************************
//    * 6) UPDATE MEMBER TABLE
//    ************************************************/
//   await pool.query(
//     `
//       UPDATE member SET
//         fullName = ?,
//         email = ?,
//         phone = ?,
//         gender = ?,
//         dateOfBirth = ?,
//         address = ?
//       WHERE userId = ?
//     `,
//     [
//       fullName,
//       updatedEmail,
//       updatedPhone,
//       updatedGender,
//       updatedDob,
//       address,
//       userId
//     ]
//   );

//   /************************************************
//    * 7) UPDATE USER TABLE ALSO
//    ************************************************/
//   await pool.query(
//     `
//       UPDATE user SET
//         fullName = ?,
//         email = ?,
//         phone = ?,
//         address = ?
//       WHERE id = ?
//     `,
//     [fullName, updatedEmail, updatedPhone, address, userId]
//   );

//   /************************************************
//    * 8) RETURN UPDATED PROFILE
//    ************************************************/
//   return getMemberProfileService(userId);
// };

export const updateMemberPersonalService = async (userId, data) => {
  const {
    first_name,
    last_name,
    dateOfBirth,
    email,
    phone,
    address_street,
    address_city,
    address_state,
    address_zip,
    gender,
    profileImage,
    gstNumber,
    tax,
    gymAddress,
    gymName
  } = data;

  const [[userRow]] = await pool.query(
    `SELECT * FROM user WHERE id = ?`,
    [userId]
  );

  if (!userRow) {
    throw { status: 404, message: "User not found" };
  }

  const fullName =
    first_name && last_name
      ? `${first_name} ${last_name}`.trim()
      : userRow.fullName;

  const updatedEmail = email || userRow.email;
  const updatedPhone = phone || userRow.phone || "0000000000";
  const updatedDob = dateOfBirth ? dateOfBirth : userRow.dateOfBirth;
  const updatedGstNumber = gstNumber ?? userRow.gstNumber;
  const updatedTax = tax ?? userRow.tax;
  const updatedGymAddress = gymAddress ?? userRow.gymAddress;
  const updatedGymName = gymName ?? userRow.gymName;


  const addressParts = [
    address_street || null,
    address_city || null,
    address_state || null,
    address_zip || null,
  ].filter(Boolean);

  const address =
    addressParts.length > 0 ? addressParts.join(", ") : userRow.address;

  // email duplicate check
  const [emailExists] = await pool.query(
    `SELECT id FROM user WHERE email = ? AND id != ?`,
    [updatedEmail, userId]
  );

  if (emailExists.length > 0) {
    throw { status: 400, message: "Email already in use" };
  }

  // ✅ profileImage fallback
  const updatedProfileImage = profileImage || userRow.profileImage;

  await pool.query(
    `
    UPDATE user SET
      fullName = ?,
      email = ?,
      phone = ?,
      dateOfBirth = ?,
      address_street = ?,
      address_city = ?,
      address_state = ?,
      address_zip = ?,
      address = ?,
      gender = ?,
      profileImage = ?,   -- ✅ NEW
      gstNumber = ?,
      tax = ?,
      gymAddress = ?,
      gymName = ?    

    WHERE id = ?
    `,
    [
      fullName,
      updatedEmail,
      updatedPhone,
      updatedDob,
      address_street,
      address_city,
      address_state,
      address_zip,
      address,
      gender,
      updatedProfileImage,
      updatedGstNumber,
      updatedTax,
      updatedGymAddress,
      updatedGymName,
      userId,

    ]
  );

  const [[updatedUser]] = await pool.query(
    `SELECT * FROM user WHERE id = ?`,
    [userId]
  );

  return updatedUser;
};











/*******************************************************
 * CHANGE PASSWORD (using userId)
 * Step-by-step: verify old → hash new → update user & member
 *******************************************************/
export const changeMemberPasswordService = async (
  userId,
  currentPassword,
  newPassword
) => {
  // 1) User table se current password lao (correct column = id)
  const [[userRow]] = await pool.query(
    `SELECT password FROM user WHERE id = ?`,
    [userId]
  );

  if (!userRow) {
    throw { status: 404, message: "Member not found" };
  }

  // 2) Old password compare karo (trim input to avoid space issues)
  const match = await bcrypt.compare(currentPassword.trim(), userRow.password);
  if (!match) {
    throw { status: 400, message: "Current password is incorrect" };
  }

  // 3) New password hash karo
  const hashed = await bcrypt.hash(newPassword, 10);

  // 4) USER table update (correct)
  await pool.query(
    `UPDATE user SET password = ? WHERE id = ?`,
    [hashed, userId]
  );

  // 5) MEMBER table update (correct column = userId)
  await pool.query(
    `UPDATE member SET password = ? WHERE userId = ?`,
    [hashed, userId]
  );

  return { message: "Password updated successfully" };
};
