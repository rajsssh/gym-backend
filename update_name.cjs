const mysql = require('mysql2/promise');

async function updateName() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gym_new_db'
  });

  const [result] = await connection.execute(
    'UPDATE user SET fullName = ? WHERE email = ?',
    ['Sales', 'receptionist@gmail.com']
  );

  console.log('Update result:', result);
  await connection.end();
}

updateName().catch(console.error);
