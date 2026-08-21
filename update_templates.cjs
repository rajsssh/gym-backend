const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const templatesToUpdate = [
  { key: 'MEMBER_CREATED', name: 'Member Created', subject: 'Welcome to {GymName}!', message: 'Hi {Name},\n\nYour account has been successfully created at {GymName}.\n\nLogin Details:\nEmail: {Email}\nPassword: {Password}\n\nPlease login and change your password for security.\n\nThank you!', vars: '["Name", "GymName", "Email", "Password"]' },
  { key: 'MEMBER_PLAN_ASSIGNED', name: 'Plan Assigned', subject: 'Plan Assigned - {GymName}', message: 'Hi {Name},\n\n{PlanName} has been assigned to you at {GymName}.\n\nPlan Details:\nValid till: {Validity}\nPrice: {Price}\nPayment Mode: {PaymentMode}\nDate/Time: {DateTime}\n\nThank you!', vars: '["Name", "PlanName", "GymName", "Validity", "Price", "PaymentMode", "DateTime"]' },
  { key: 'MEMBER_ATTENDANCE', name: 'Member Attendance', subject: 'Attendance Marked - {GymName}', message: 'Hi {Name},\n\nYour attendance at {GymName} has been marked as {Status}.\n\nDate: {Date}\nTime: {Time}\n\nThank you!', vars: '["Name", "Date", "Status", "GymName", "Time"]' },
  { key: 'DIET_PLAN_ASSIGNED', name: 'Diet Plan Assigned', subject: 'New Diet Plan - {GymName}', message: 'Hi {Name},\n\nA new diet plan has been assigned to you at {GymName}.\n\nDiet Details:\n{DietDetails}\n\nTrainer: {TrainerName}\n\nPlease check your dashboard for more details.', vars: '["Name", "GymName", "DietDetails", "TrainerName"]' },
  { key: 'WORKOUT_PLAN_ASSIGNED', name: 'Workout Plan Assigned', subject: 'New Workout Plan - {GymName}', message: 'Hi {Name},\n\nA new workout plan has been assigned to you at {GymName}.\n\nWorkout Details:\n{WorkoutDetails}\n\nTrainer: {TrainerName}\n\nPlease check your dashboard for more details.', vars: '["Name", "GymName", "WorkoutDetails", "TrainerName"]' }
];

async function run() {
  const pool = mysql.createPool('mysql://root:BVqUcROWCIrVnzhGaSayAJkaetgPkYGJ@tokaido.proxy.rlwy.net:55340/railway');

  for (const t of templatesToUpdate) {
    console.log(`Updating template ${t.key}...`);
    await pool.query(
      "UPDATE message_templates SET subject = ?, message = ?, variables = ? WHERE eventKey = ?",
      [t.subject, t.message, t.vars, t.key]
    );
  }

  console.log("Templates updated successfully!");
  pool.end();
}

run();
