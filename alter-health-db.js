import mysql from 'mysql2/promise';

async function alterTable() {
  try {
    const pool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "gym_db",
      port: 3307
    });

    try {
      await pool.query("ALTER TABLE member_health_log ADD COLUMN trainerId INT NULL");
      console.log("Added trainerId");
    } catch (e) { console.log(e.message); }

    try {
      await pool.query("ALTER TABLE member_health_log ADD COLUMN bmiStatus VARCHAR(255) NULL");
      console.log("Added bmiStatus");
    } catch (e) { console.log(e.message); }

    try {
      await pool.query("ALTER TABLE member_health_log ADD COLUMN notes TEXT NULL");
      console.log("Added notes");
    } catch (e) { console.log(e.message); }

    try {
      await pool.query("ALTER TABLE member_health_log ADD COLUMN dietChart TEXT NULL");
      console.log("Added dietChart");
    } catch (e) { console.log(e.message); }

    console.log("Done");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
alterTable();
