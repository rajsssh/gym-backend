import { pool } from './src/config/db.js';

const alterTable = async () => {
  try {
    await pool.query("ALTER TABLE user ADD COLUMN trialStatus VARCHAR(50) DEFAULT 'None'");
    console.log("Added trialStatus column");
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("trialStatus column already exists");
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  }
}
alterTable();
