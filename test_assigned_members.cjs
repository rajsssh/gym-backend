const mysql = require('mysql2/promise');
async function test() {
  const connection = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'gym_new_db' });
  const [rows] = await connection.execute(`
    SELECT DISTINCT m.id, m.fullName
    FROM member m
    JOIN member_plan_assignment mpa ON m.id = mpa.memberId
    JOIN memberplan p ON mpa.planId = p.id
    WHERE p.trainerId = 102
  `);
  console.log('Members for trainer 102:', rows);
  await connection.end();
}
test().catch(console.error);
