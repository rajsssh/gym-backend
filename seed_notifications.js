import { pool } from "./src/config/db.js";

const newTemplates = [
  { key: 'NEW_ADMIN_REQUEST', name: 'New Admin Request', subject: 'New SaaS Plan Request', message: 'Hi Superadmin, {AdminName} has requested or purchased the {PlanName} plan.', vars: '["AdminName", "PlanName"]' },
  { key: 'ADMIN_REQUEST_APPROVED', name: 'Admin Request Approved', subject: 'SaaS Plan Approved', message: 'Hi {Name}, your request for the {PlanName} plan has been approved and activated.', vars: '["Name", "PlanName"]' },
  { key: 'MEMBER_ATTENDANCE', name: 'Member Attendance', subject: 'Attendance Marked', message: 'Hi {Name}, your attendance for {Date} has been marked as {Status}.', vars: '["Name", "Date", "Status"]' },
  { key: 'DIET_PLAN_ASSIGNED', name: 'Diet Plan Assigned', subject: 'New Diet Plan', message: 'Hi {Name}, a new diet plan has been assigned to you. Please check your dashboard.', vars: '["Name"]' },
  { key: 'WORKOUT_PLAN_ASSIGNED', name: 'Workout Plan Assigned', subject: 'New Workout Plan', message: 'Hi {Name}, a new workout plan has been assigned to you. Please check your dashboard.', vars: '["Name"]' },
  { key: 'HEALTH_LOG_ADDED', name: 'Health Log Added', subject: 'Health Log Updated', message: 'Hi {Name}, a new health log entry has been added to your profile.', vars: '["Name"]' },
  { key: 'CLASS_BOOKED', name: 'Class Booked', subject: 'Class Booking Confirmed', message: 'Hi {Name}, your booking for the class {ClassName} is confirmed for {Date}.', vars: '["Name", "ClassName", "Date"]' }
];

async function seed() {
  try {
    for (const t of newTemplates) {
      await pool.query(
        "INSERT IGNORE INTO message_templates (eventKey, name, subject, message, variables, channel) VALUES (?, ?, ?, ?, ?, ?)",
        [t.key, t.name, t.subject, t.message, t.vars, 'EMAIL,IN_APP']
      );
      
      // Update if already exists to ensure latest format
      await pool.query(
        "UPDATE message_templates SET subject = ?, message = ?, variables = ?, channel = 'EMAIL,IN_APP' WHERE eventKey = ?",
        [t.subject, t.message, t.vars, t.key]
      );
    }
    console.log("✅ Custom message templates seeded successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to seed templates:", err);
    process.exit(1);
  }
}

seed();
