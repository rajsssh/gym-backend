const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const newAdminTemplates = [
  {
    key: 'ADMIN_TRAINER_ASSIGNED',
    name: 'Admin: Trainer Assigned',
    subject: 'Trainer assigned to a member at {GymName}',
    message: 'Hello Admin,\n\nTrainer {TrainerName} has been assigned to Member {MemberName}.\n\nGym: {GymName}',
    vars: '["TrainerName", "MemberName", "GymName"]',
    channel: 'IN_APP,EMAIL'
  },
  {
    key: 'ADMIN_PROGRESS_UPDATED',
    name: 'Admin: Progress Updated',
    subject: 'Bodybuilder Progress Updated for {MemberName}',
    message: 'Hello Admin,\n\nProgress logs have been updated for Member {MemberName}.\n\nGym: {GymName}',
    vars: '["MemberName", "GymName"]',
    channel: 'IN_APP,EMAIL'
  }
];

async function run() {
  const pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://root:BVqUcROWCIrVnzhGaSayAJkaetgPkYGJ@tokaido.proxy.rlwy.net:55340/railway');

  for (const t of newAdminTemplates) {
    try {
      const [existing] = await pool.query("SELECT id FROM message_templates WHERE eventKey = ?", [t.key]);
      if (existing.length === 0) {
        console.log(`Inserting template ${t.key}...`);
        await pool.query(
          "INSERT INTO message_templates (eventKey, name, subject, message, variables, channel, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)",
          [t.key, t.name, t.subject, t.message, t.vars, t.channel]
        );
      } else {
        console.log(`Updating template ${t.key}...`);
        await pool.query(
          "UPDATE message_templates SET channel = 'IN_APP,EMAIL' WHERE eventKey = ?",
          [t.key]
        );
      }
    } catch (err) {
      console.error(`Error processing ${t.key}:`, err.message);
    }
  }

  // Update previously inserted templates to make sure they have EMAIL
  const keysToUpdate = ['TRAINER_ASSIGNED', 'MEMBER_ASSIGNED_TO_TRAINER', 'PROGRESS_UPDATED', 'CLIENT_PROGRESS_UPDATED'];
  for (const key of keysToUpdate) {
    try {
      await pool.query("UPDATE message_templates SET channel = 'IN_APP,EMAIL' WHERE eventKey = ?", [key]);
      console.log(`Updated channel for ${key}`);
    } catch(err) {
      console.error(`Error updating ${key}:`, err.message);
    }
  }

  console.log("Admin seed script finished!");
  process.exit(0);
}

run();
