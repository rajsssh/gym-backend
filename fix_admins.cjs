const mysql = require('mysql2/promise');

async function fixAdmins() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gym_new_db'
  });

  const [result] = await connection.execute(
    'UPDATE user SET adminId = 90 WHERE adminId IS NULL AND roleId IN (2, 3, 4, 5, 6)'
  );
  
  console.log('Fixed adminIds for staff:', result);
  await connection.end();
}

fixAdmins().catch(console.error);
