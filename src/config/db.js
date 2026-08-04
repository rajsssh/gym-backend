import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// Create a **Promise Pool directly**
export const pool = mysql
  .createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "gym_db",
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  .promise();

// Test MySQL connection — release immediately, run seeding in background
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ MySQL connected successfully!");
    connection.release(); // 🔥 Release immediately so the server can start fast

    // Run all heavy seeding/migration in background (non-blocking)
    runStartupMigrations().catch((err) =>
      console.error("❌ Startup migrations error:", err.message)
    );
  })
  .catch((err) => {
    console.error("❌ MySQL connection failed:", err.message);
  });

/**
 * Non-blocking startup migrations — runs AFTER server is ready.
 */
async function runStartupMigrations() {
  // Alter session table
  try {
    await pool.query("ALTER TABLE session ADD COLUMN capacity INT NOT NULL DEFAULT 20");
  } catch (e) {
    // Column already exists — safe to ignore
  }

  // Alter workout tables
  try {
    await pool.query("ALTER TABLE workoutplan MODIFY branchId INT NULL");
  } catch (e) {}
  
  try {
    await pool.query("ALTER TABLE workoutexercise ADD COLUMN duration VARCHAR(100) NULL");
  } catch (e) {}

  try {
    await pool.query("ALTER TABLE workoutexercise ADD COLUMN notes TEXT NULL");
  } catch (e) {}

  // Alter plan table for discountPercent
  try {
    await pool.query("ALTER TABLE plan ADD COLUMN discountPercent DECIMAL(5,2) DEFAULT 0");
  } catch (e) {
    // Column already exists — safe to ignore
  }

  // Create app_notification table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_notification (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        senderId INT NULL,
        receiverId INT NOT NULL,
        receiverRole VARCHAR(50) NOT NULL,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        referenceType VARCHAR(100) NULL,
        referenceId VARCHAR(100) NULL,
        actionUrl VARCHAR(255) NULL,
        metadata JSON NULL,
        isRead BOOLEAN DEFAULT FALSE,
        readAt DATETIME NULL,
        priority VARCHAR(50) DEFAULT 'NORMAL',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenantId (tenantId),
        INDEX idx_receiverId (receiverId),
        INDEX idx_receiverRole (receiverRole),
        INDEX idx_createdAt (createdAt),
        INDEX idx_isRead (isRead)
      );
    `);
    console.log("✅ Table app_notification created or verified.");
  } catch (e) {
    console.error("❌ Failed to create app_notification table:", e.message);
  }

  // Create/migrate message_templates
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_templates_new (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventKey VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        channel VARCHAR(100) DEFAULT 'EMAIL',
        isActive BOOLEAN DEFAULT TRUE,
        variables JSON,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    const [cols] = await pool.query("SHOW COLUMNS FROM message_templates LIKE 'templateType'");
    if (cols.length > 0) {
      await pool.query("DROP TABLE message_templates");
      await pool.query("RENAME TABLE message_templates_new TO message_templates");
    } else {
      await pool.query("CREATE TABLE IF NOT EXISTS message_templates LIKE message_templates_new");
      await pool.query("DROP TABLE message_templates_new");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS template_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        templateId INT NOT NULL,
        adminId INT,
        ipAddress VARCHAR(45),
        oldSubject VARCHAR(255),
        newSubject VARCHAR(255),
        oldMessage TEXT,
        newMessage TEXT,
        changedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Tables message_templates and template_audit_logs created or verified.");

    // Seed default templates
    const defaultTemplates = [
      { key: 'WELCOME_TRIAL', name: 'Welcome Trial', subject: 'Welcome to our Gym!', message: 'Hi {Name}, your trial has started.', vars: '["Name"]' },
      { key: 'EXPIRY_REMINDER_DAILY', name: 'Expiry Reminder', subject: 'Plan Expiring Soon', message: 'Hi {Name}, your plan {PlanName} expires in {Days} days.', vars: '["Name", "PlanName", "Days"]' },
      { key: 'TRIAL_EXPIRED_FINAL', name: 'Trial Expired', subject: 'Trial Expired', message: 'Hi {Name}, your trial has expired.', vars: '["Name"]' },
      { key: 'SUBSCRIPTION_ACTIVATED', name: 'Subscription Activated', subject: 'Subscription Activated', message: 'Hi {Name}, your subscription for {PlanName} has been successfully activated. Amount Paid: {Amount}', vars: '["Name", "PlanName", "Amount"]' },
      { key: 'PLAN_PURCHASED', name: 'Plan Purchased', subject: 'Plan Purchased', message: 'Hi {Name}, you purchased {PlanName}.', vars: '["Name", "PlanName"]' },
      { key: 'PLAN_UPGRADE_REQUEST', name: 'Plan Upgrade Request', subject: 'New Plan Upgrade Request', message: 'Admin: {AdminName}\\nGym: {GymName}\\nCurrent Plan: {CurrentPlan}\\nRequested Plan: {RequestedPlan}\\nBilling: Monthly / Yearly\\nRequested At: {DateTime}\\nStatus: Pending', vars: '["AdminName", "GymName", "CurrentPlan", "RequestedPlan", "DateTime"]' },
      { key: 'PLAN_UPGRADED', name: 'Plan Upgraded', subject: 'Plan Upgraded', message: 'Hi {Name}, your plan has been successfully upgraded to {PlanName}.', vars: '["Name", "PlanName"]' },
      { key: 'MEMBER_CREATED', name: 'Member Created', subject: 'Welcome to {GymName}!', message: 'Hi {Name},\\n\\nYour account has been successfully created at {GymName}.\\n\\nLogin Details:\\nEmail: {Email}\\nPassword: {Password}\\n\\nPlease login and change your password for security.\\n\\nThank you!', vars: '["Name", "GymName", "Email", "Password"]' },
      { key: 'MEMBER_PLAN_ASSIGNED', name: 'Plan Assigned', subject: 'Plan Assigned - {GymName}', message: 'Hi {Name},\\n\\n{PlanName} has been assigned to you at {GymName}.\\n\\nPlan Details:\\nValid till: {Validity}\\nDate/Time: {DateTime}\\n\\nThank you!', vars: '["Name", "PlanName", "GymName", "Validity", "DateTime"]' },
      { key: 'PAYMENT_SUCCESS', name: 'Payment Success', subject: 'Payment Successful', message: 'Hi {Name}, your payment of {Amount} was successful.', vars: '["Name", "Amount"]' },
      { key: 'PAYMENT_FAILED', name: 'Payment Failed', subject: 'Payment Failed', message: 'Hi {Name}, your payment of {Amount} failed.', vars: '["Name", "Amount"]' },
      { key: 'ANNOUNCEMENT', name: 'Announcement', subject: 'Gym Announcement', message: 'Dear {Name}, {Message}', vars: '["Name", "Message"]' },
      { key: 'MEMBER_EXPIRED', name: 'Member Expired', subject: 'Membership Expired', message: 'Hi {Name}, your membership has expired.', vars: '["Name"]' },
      { key: 'MEMBER_RENEWED', name: 'Member Renewed', subject: 'Membership Renewed', message: 'Hi {Name}, your membership is renewed.', vars: '["Name"]' },
      { key: 'PASSWORD_RESET', name: 'Password Reset', subject: 'Password Reset', message: 'Hi {Name}, your password reset link is {Link}', vars: '["Name", "Link"]' },
      { key: 'LOGIN_ALERT', name: 'Login Alert', subject: 'New Login', message: 'Hi {Name}, a new login was detected from {IP}.', vars: '["Name", "IP"]' },
      { key: 'EMAIL_VERIFICATION', name: 'Email Verification', subject: 'Verify Email', message: 'Hi {Name}, please verify your email: {Link}', vars: '["Name", "Link"]' },
      { key: 'CLASS_CREATED', name: 'Class Created', subject: 'New Class Schedule', message: 'Hi {Name}, a new class {ClassName} has been scheduled for {Date}.', vars: '["Name", "ClassName", "Date"]' },
      { key: 'CLASS_UPDATED', name: 'Class Updated', subject: 'Class Schedule Updated', message: 'Hi {Name}, the class {ClassName} schedule has been updated.', vars: '["Name", "ClassName"]' },
      { key: 'CLASS_CANCELLED', name: 'Class Cancelled', subject: 'Class Cancelled', message: 'Hi {Name}, the class {ClassName} has been cancelled.', vars: '["Name", "ClassName"]' },
      { key: 'SESSION_CREATED', name: 'Session Created', subject: 'New Session Booked', message: 'Hi {Name}, a new session {SessionName} has been booked.', vars: '["Name", "SessionName"]' },
      { key: 'SESSION_UPDATED', name: 'Session Updated', subject: 'Session Updated', message: 'Hi {Name}, the session {SessionName} has been updated.', vars: '["Name", "SessionName"]' },
      { key: 'SESSION_CANCELLED', name: 'Session Cancelled', subject: 'Session Cancelled', message: 'Hi {Name}, the session {SessionName} has been cancelled.', vars: '["Name", "SessionName"]' },
      { key: 'FORGOT_PASSWORD_OTP', name: 'Forgot Password OTP', subject: 'Password Reset OTP', message: 'Hi {Name},\\n\\nYour OTP is\\n{OTP}\\n\\nIt will expire in\\n10 Minutes.\\n\\nIf you did not request this,\\nplease ignore this email.', vars: '["Name", "OTP", "CompanyName"]' },
      { key: 'PASSWORD_CHANGED', name: 'Password Changed', subject: 'Password Changed Successfully', message: 'Your account password has been changed successfully.\\n\\nIf this was not you, please contact your administrator immediately.', vars: '[]' },
      { key: 'NEW_ADMIN_REQUEST', name: 'New Admin Request', subject: 'New SaaS Plan Request', message: 'Hi Superadmin, {AdminName} has requested or purchased the {PlanName} plan.', vars: '["AdminName", "PlanName"]' },
      { key: 'ADMIN_REQUEST_APPROVED', name: 'Admin Request Approved', subject: 'SaaS Plan Approved', message: 'Hi {Name}, your request for the {PlanName} plan has been approved and activated.', vars: '["Name", "PlanName"]' },
      { key: 'MEMBER_ADDED', name: 'Member Added Alert', subject: 'New Member Added', message: 'Hi Admin, a new member {Name} has been added to your gym.', vars: '["Name"]' },
      { key: 'MEMBER_ATTENDANCE', name: 'Member Attendance', subject: 'Attendance Marked - {GymName}', message: 'Hi {Name},\\n\\nYour attendance at {GymName} has been marked as {Status}.\\n\\nDate: {Date}\\nTime: {Time}\\n\\nThank you!', vars: '["Name", "Date", "Status", "GymName", "Time"]' },
      { key: 'DIET_PLAN_ASSIGNED', name: 'Diet Plan Assigned', subject: 'New Diet Plan - {GymName}', message: 'Hi {Name},\\n\\nA new diet plan has been assigned to you at {GymName}.\\n\\nDiet Details:\\n{DietDetails}\\n\\nTrainer: {TrainerName}\\n\\nPlease check your dashboard for more details.', vars: '["Name", "GymName", "DietDetails", "TrainerName"]' },
      { key: 'WORKOUT_PLAN_ASSIGNED', name: 'Workout Plan Assigned', subject: 'New Workout Plan - {GymName}', message: 'Hi {Name},\\n\\nA new workout plan has been assigned to you at {GymName}.\\n\\nWorkout Details:\\n{WorkoutDetails}\\n\\nTrainer: {TrainerName}\\n\\nPlease check your dashboard for more details.', vars: '["Name", "GymName", "WorkoutDetails", "TrainerName"]' },
      { key: 'HEALTH_LOG_ADDED', name: 'Health Log Added', subject: 'Health Log Updated', message: 'Hi {Name}, a new health log entry has been added to your profile.', vars: '["Name"]' },
      { key: 'CLASS_BOOKED', name: 'Class Booked', subject: 'Class Booking Confirmed', message: 'Hi {Name}, your booking for the class {ClassName} is confirmed for {Date}.', vars: '["Name", "ClassName", "Date"]' }
    ];

    for (const t of defaultTemplates) {
      await pool.query(
        "INSERT IGNORE INTO message_templates (eventKey, name, subject, message, variables, channel) VALUES (?, ?, ?, ?, ?, ?)",
        [t.key, t.name, t.subject, t.message, t.vars, 'EMAIL,IN_APP']
      );
    }

    // Enforce correct channels for critical templates
    await pool.query(`
      UPDATE message_templates
      SET channel = 'EMAIL,IN_APP'
      WHERE eventKey IN (
        'PLAN_UPGRADE_REQUEST', 'PLAN_UPGRADED', 'SUBSCRIPTION_ACTIVATED', 'ANNOUNCEMENT', 'PLAN_PURCHASED',
        'MEMBER_CREATED', 'MEMBER_PLAN_ASSIGNED', 'MEMBER_ATTENDANCE', 'DIET_PLAN_ASSIGNED', 'WORKOUT_PLAN_ASSIGNED',
        'HEALTH_LOG_ADDED', 'CLASS_BOOKED', 'CLASS_CREATED', 'SESSION_CREATED'
      )
    `);

    // Force-update specific templates to latest content
    const templatesToForceUpdate = [
      'PLAN_UPGRADE_REQUEST', 'PLAN_PURCHASED', 'PLAN_UPGRADED', 'SUBSCRIPTION_ACTIVATED',
      'NEW_ADMIN_REQUEST', 'ADMIN_REQUEST_APPROVED', 'MEMBER_ADDED', 'MEMBER_ATTENDANCE',
      'DIET_PLAN_ASSIGNED', 'WORKOUT_PLAN_ASSIGNED', 'HEALTH_LOG_ADDED', 'CLASS_BOOKED'
    ];
    for (const eventKey of templatesToForceUpdate) {
      const tmpl = defaultTemplates.find(t => t.key === eventKey);
      if (tmpl) {
        await pool.query(
          "UPDATE message_templates SET subject = ?, message = ?, variables = ?, channel = 'EMAIL,IN_APP' WHERE eventKey = ?",
          [tmpl.subject, tmpl.message, tmpl.vars, eventKey]
        );
      }
    }

    console.log("✅ Default message templates seeded.");
  } catch (e) {
    console.error("❌ Failed to create message_templates tables:", e.message);
  }

  // Create enterprise tables
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT,
        receiverId INT NOT NULL,
        receiverRole VARCHAR(50),
        type VARCHAR(100),
        title VARCHAR(255),
        message TEXT,
        referenceType VARCHAR(100),
        referenceId VARCHAR(100),
        actionUrl VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        retryCount INT DEFAULT 0,
        processAfter DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_processAfter (processAfter)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_delivery_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        notificationId INT,
        tenantId INT,
        receiverId INT,
        status VARCHAR(50) DEFAULT 'CREATED',
        errorReason TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_notificationId (notificationId),
        INDEX idx_receiverId (receiverId)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_notification_archive (
        id INT PRIMARY KEY,
        tenantId INT,
        senderId INT,
        receiverId INT NOT NULL,
        receiverRole VARCHAR(50),
        type VARCHAR(100),
        title VARCHAR(255),
        message TEXT,
        referenceType VARCHAR(100),
        referenceId VARCHAR(100),
        actionUrl VARCHAR(255),
        metadata JSON,
        priority VARCHAR(50) DEFAULT 'NORMAL',
        isRead BOOLEAN DEFAULT FALSE,
        readAt DATETIME NULL,
        createdAt DATETIME,
        archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        userType ENUM('USER', 'MEMBER') NOT NULL,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(255) NOT NULL,
        resetToken VARCHAR(255) NULL,
        purpose VARCHAR(50) DEFAULT 'PASSWORD_RESET',
        expiresAt DATETIME NOT NULL,
        tokenExpiresAt DATETIME NULL,
        attempts INT DEFAULT 0,
        isVerified BOOLEAN DEFAULT FALSE,
        isUsed BOOLEAN DEFAULT FALSE,
        lastSentAt DATETIME NULL,
        createdByIP VARCHAR(45),
        userAgent VARCHAR(255),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_otp (otp),
        INDEX idx_resetToken (resetToken),
        INDEX idx_expiresAt (expiresAt)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        event VARCHAR(100) NOT NULL,
        ipAddress VARCHAR(45),
        userAgent VARCHAR(255),
        details TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(500) NOT NULL,
        blacklistedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token(255))
      );
    `);

    console.log("✅ Tables notification_queue, notification_delivery_log, app_notification_archive, password_reset_otp, auth_audit_log, token_blacklist created or verified.");
  } catch (e) {
    console.error("❌ Failed to create enterprise tables:", e.message);
  }
}
