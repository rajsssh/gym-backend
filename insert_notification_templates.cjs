const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const newTemplates = [
  {
    key: 'TRAINER_ASSIGNED',
    name: 'Trainer Assigned',
    subject: 'You have been assigned a new member at {GymName}',
    message: 'Hi {TrainerName},\n\nYou have been assigned a new member: {MemberName}.\n\nPlease check your dashboard to view their profile and create an assignment.\n\nThank you,\n{GymName}',
    vars: '["TrainerName", "MemberName", "GymName"]',
    channel: 'IN_APP,EMAIL'
  },
  {
    key: 'MEMBER_ASSIGNED_TO_TRAINER',
    name: 'Member Assigned to Trainer',
    subject: 'A new trainer has been assigned to you at {GymName}',
    message: 'Hi {MemberName},\n\nYour new trainer is {TrainerName}.\n\nThey will be guiding your progress.\n\nThank you,\n{GymName}',
    vars: '["MemberName", "TrainerName", "GymName"]',
    channel: 'IN_APP,EMAIL'
  },
  {
    key: 'PROGRESS_UPDATED',
    name: 'Progress Updated',
    subject: 'Your progress has been updated at {GymName}',
    message: 'Hi {MemberName},\n\nYour body metrics and progress have been updated.\n\nPlease check your dashboard to view the latest logs.\n\nThank you,\n{GymName}',
    vars: '["MemberName", "GymName"]',
    channel: 'IN_APP'
  },
  {
    key: 'CLIENT_PROGRESS_UPDATED',
    name: 'Client Progress Updated',
    subject: 'Progress updated for {MemberName}',
    message: 'Hi {TrainerName},\n\nProgress has been logged for your client {MemberName}.\n\nPlease review their latest measurements.\n\nThank you,\n{GymName}',
    vars: '["TrainerName", "MemberName", "GymName"]',
    channel: 'IN_APP'
  }
];

async function run() {
  const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://root:BVqUcROWCIrVnzhGaSayAJkaetgPkYGJ@tokaido.proxy.rlwy.net:55340/railway');

  for (const t of newTemplates) {
    try {
      const [existing] = await pool.query("SELECT id FROM message_templates WHERE eventKey = ?", [t.key]);
      if (existing.length === 0) {
        console.log(`Inserting template ${t.key}...`);
        await pool.query(
          "INSERT INTO message_templates (eventKey, name, subject, message, variables, channel, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)",
          [t.key, t.name, t.subject, t.message, t.vars, t.channel]
        );
      } else {
        console.log(`Template ${t.key} already exists. Skipping.`);
      }
    } catch (err) {
      console.error(`Error inserting ${t.key}:`, err.message);
    }
  }

  console.log("Seed script finished!");
  process.exit(0);
}

run();
