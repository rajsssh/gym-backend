import { pool } from './src/config/db.js';
import bcrypt from 'bcryptjs';

const reset = async () => {
  try {
    const hash = await bcrypt.hash("123456", 10);
    await pool.query('UPDATE user SET password = ? WHERE email = "superadmin@gmail.com"', [hash]);
    console.log("Password for superadmin@gmail.com updated to: 123456");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
reset();
