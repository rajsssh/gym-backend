import mysql from 'mysql2/promise';

async function checkTable() {
  try {
    const pool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "gym_db",
      port: 3307
    });

    const [rows] = await pool.query("SHOW COLUMNS FROM member_health_log");
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
checkTable();
