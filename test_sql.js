import 'dotenv/config';
import { pool } from './src/config/db.js';

pool.query(`
      SELECT 
        a.id,
        a.memberId,
        a.staffId,
        a.branchId,
        a.checkIn,
        a.checkOut,
        a.createdAt,
        a.notes,
        a.status,
        a.mode,
        COALESCE(m.fullName, u.fullName) AS fullName
      FROM memberattendance a
      LEFT JOIN member m ON a.memberId = m.id
      LEFT JOIN staff s ON a.staffId = s.id
      LEFT JOIN user u ON s.userId = u.id
      WHERE a.memberId = 11 
         OR a.staffId = 11 
         OR a.memberId = (SELECT id FROM member WHERE userId = 11 LIMIT 1)
         OR a.staffId = (SELECT id FROM staff WHERE userId = 11 LIMIT 1)
      ORDER BY a.id DESC
`).then(r => console.log(r[0])).catch(console.error).finally(() => process.exit());
