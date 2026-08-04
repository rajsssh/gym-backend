import mysql from 'mysql2/promise';

async function check() {
  const c = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "gym_new_db",
  });
  
  const [users] = await c.query("SELECT id, email, roleId, profileImage FROM user");
  console.log("All Users & Profile Images in Database:");
  console.table(users);
  await c.end();
}
check();
