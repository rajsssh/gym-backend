import bcrypt from 'bcryptjs';
import { pool } from './src/config/db.js';

async function updatePasswords() {
  try { 
    const hash = await bcrypt.hash('123456', 10); 
    await pool.query("UPDATE user SET password = ? WHERE email = 'john@gmail.com' OR email = 'dszxcd@gmail.com' OR email = 'smith1@gmail.com'", [hash]); 
    console.log('Reset passwords to 123456 for John Smith accounts'); 
  } catch (e) { 
    console.error('DB ERROR:', e); 
  } 
  process.exit(0);
}
updatePasswords();
