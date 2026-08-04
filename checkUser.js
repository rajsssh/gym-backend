import { pool } from './src/config/db.js';

const check = async () => {
  try {
    const [rows] = await pool.query('SELECT id, email, password, roleId FROM user WHERE email = "superadmin@gmail.com"');
    console.log(rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
