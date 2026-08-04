const mysql = require('mysql2/promise');

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gym_new_db'
  });

  const [members] = await connection.execute('SELECT id, fullName, adminId, branchId FROM member LIMIT 10');
  console.log("Members:", members);

  await connection.end();
}

test().catch(console.error);
