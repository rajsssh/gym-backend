const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'',database:'gym_new_db'});
  const [users] = await c.query(
    "SELECT u.id, u.fullName, u.email, u.roleId, r.name as roleName, u.adminId, u.branchId FROM user u JOIN role r ON u.roleId=r.id WHERE r.name IN ('receptionist','generaltrainer','personaltrainer','housekeeping','member') ORDER BY r.id"
  );
  console.log(JSON.stringify(users, null, 2));
  await c.end();
}
run().catch(console.error);
