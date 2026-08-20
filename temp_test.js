import mysql from 'mysql2/promise';
import axios from 'axios';
import bcrypt from 'bcryptjs';

const DB_URL = 'mysql://root:wxFBsiBhfKYbDBEIhOeVugzCRKqMJyNw@sakura.proxy.rlwy.net:21149/railway';
const API_URL = 'https://gym-backend-production-abef.up.railway.app/api';

async function run() {
  const conn = await mysql.createConnection(DB_URL);
  try {
    const hash = bcrypt.hashSync('123456', 10);
    const email = 'test_admin_e2e_expiry_' + Date.now() + '@example.com';
    const [gaRes] = await conn.query(
      `INSERT INTO user (fullName, email, password, roleId, status, trialStatus) VALUES (?, ?, ?, 2, 'Active', 'Expired')`,
      ['E2E GymAdmin Expired', email, hash]
    );
    
    const loginAgain = await axios.post(API_URL + '/auth/login', { email, password: '123456' });
    console.log('User response:', JSON.stringify(loginAgain.data.user, null, 2));
    
    await conn.query('DELETE FROM user WHERE id = ?', [gaRes.insertId]);
  } catch(e) { console.error('Error:', e.message, e.response?.data); }
  await conn.end();
}
run();
