const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs');

async function run() {
  const c = await mysql.createConnection({host:'localhost',user:'root',password:'',database:'gym_new_db'});

  // 1. Add sales_agent role if not exists
  const [existing] = await c.query("SELECT id FROM role WHERE name='sales_agent'");
  let salesRoleId;
  if (existing.length === 0) {
    const [result] = await c.query("INSERT INTO role (name) VALUES ('sales_agent')");
    salesRoleId = result.insertId;
    console.log("Created sales_agent role with id:", salesRoleId);
  } else {
    salesRoleId = existing[0].id;
    console.log("sales_agent role already exists with id:", salesRoleId);
  }

  // 2. Update fullName of receptionist test user (id=103) from "Sales" to "Receptionist"
  await c.query("UPDATE user SET fullName='Receptionist' WHERE id=103");
  console.log("Updated user id=103 fullName to 'Receptionist'");

  // 3. Create a new Sales Agent user if not exists
  const [salesUserExist] = await c.query("SELECT id FROM user WHERE email='salesagent@gmail.com'");
  if (salesUserExist.length === 0) {
    const hashedPassword = await bcryptjs.hash('123456', 10);
    await c.query(
      "INSERT INTO user (fullName, email, password, roleId, adminId, branchId) VALUES (?, ?, ?, ?, ?, ?)",
      ['Sales Agent', 'salesagent@gmail.com', hashedPassword, salesRoleId, 90, 48]
    );
    console.log("Created Sales Agent user: salesagent@gmail.com / 123456");
  } else {
    console.log("Sales Agent user already exists");
  }

  // 4. Verify final state
  const [roles] = await c.query("SELECT * FROM role ORDER BY id");
  console.log("\nAll roles:", roles.map(r => `${r.id}:${r.name}`).join(', '));

  await c.end();
}
run().catch(console.error);
