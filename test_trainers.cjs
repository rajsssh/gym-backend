const mysql = require('mysql2/promise');

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gym_new_db'
  });

  const [cols] = await connection.query("SHOW COLUMNS FROM memberplan");
  console.log("memberplan columns:", cols.map(c => c.Field));
  
  await connection.end();
}

test().catch(console.error);
