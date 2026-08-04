const mysql = require('mysql2/promise');
async function test() {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'gym_new_db' });
  
  // Check trainer 102's assigned members via memberplan.trainerId
  const [via_plan] = await conn.execute(`
    SELECT DISTINCT m.id, m.fullName, m.planId, p.name AS planName, p.trainerId, p.trainerType
    FROM member m
    JOIN memberplan p ON m.planId = p.id
    WHERE p.trainerId = 102
  `);
  console.log('Via member.planId join:', via_plan);

  // Check via member_plan_assignment
  const [via_assignment] = await conn.execute(`
    SELECT DISTINCT m.id, m.fullName, mpa.planId, p.name AS planName, p.trainerId
    FROM member m
    JOIN member_plan_assignment mpa ON m.id = mpa.memberId
    JOIN memberplan p ON mpa.planId = p.id
    WHERE p.trainerId = 102
  `);
  console.log('Via member_plan_assignment:', via_assignment);
  
  // What the new endpoint returns (UNION both)
  const [both] = await conn.execute(`
    SELECT DISTINCT m.id, m.fullName
    FROM member m
    LEFT JOIN member_plan_assignment mpa ON m.id = mpa.memberId
    LEFT JOIN memberplan p1 ON mpa.planId = p1.id
    LEFT JOIN memberplan p2 ON m.planId = p2.id
    WHERE (p1.trainerId = 102 OR p2.trainerId = 102)
    ORDER BY m.fullName
  `);
  console.log('Combined result from /trainer/102:', both);

  await conn.end();
}
test().catch(console.error);
