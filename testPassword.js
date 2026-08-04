import { pool } from './src/config/db.js';
import bcrypt from 'bcryptjs';

const test = async () => {
  try {
    const [rows] = await pool.query('SELECT password FROM user WHERE email = "superadmin@gmail.com"');
    const hash = rows[0].password;
    const match = await bcrypt.compare("admin", hash);
    console.log("Password match:", match);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
