import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// ✅ Run against the PRODUCTION Railway database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
});

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('🔗 Connected to database:', process.env.DB_NAME);

    // Add razorpayKeyId if it doesn't exist
    try {
      await conn.query(`ALTER TABLE user ADD COLUMN razorpayKeyId VARCHAR(255) NULL`);
      console.log('✅ Column razorpayKeyId added successfully.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Column razorpayKeyId already exists — skipping.');
      } else {
        throw err;
      }
    }

    // Add razorpayKeySecret if it doesn't exist
    try {
      await conn.query(`ALTER TABLE user ADD COLUMN razorpayKeySecret VARCHAR(255) NULL`);
      console.log('✅ Column razorpayKeySecret added successfully.');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Column razorpayKeySecret already exists — skipping.');
      } else {
        throw err;
      }
    }

    console.log('\n🎉 Migration complete! Login should now work.');
  } finally {
    conn.release();
    await pool.end();
    process.exit(0);
  }
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
