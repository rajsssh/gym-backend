const mysql = require('mysql2/promise');
async function test() {
  const conn = await mysql.createConnection('mysql://root:BVqUcROWCIrVnzhGaSayAJkaetgPkYGJ@tokaido.proxy.rlwy.net:55340/railway');
  await conn.query(`UPDATE user SET profileImage = REPLACE(profileImage, 'http://localhost:4000', 'https://gym-backend-production-062c.up.railway.app') WHERE profileImage LIKE 'http://localhost:4000%'`);
  await conn.query(`UPDATE member SET profileImage = REPLACE(profileImage, 'http://localhost:4000', 'https://gym-backend-production-062c.up.railway.app') WHERE profileImage LIKE 'http://localhost:4000%'`);
  console.log('Fixed profile images!');
  await conn.end();
}
test().catch(console.error);
